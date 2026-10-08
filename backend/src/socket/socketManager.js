/**
 * backend/src/socket/socketManager.js
 *
 * Central Socket.IO event manager.
 * - Authenticates every connection via JWT
 * - Maintains in-memory registries of connected users & drivers
 * - Provides helper to get a socket by userId / driverId
 *
 * REGISTRY SHAPE:
 *   connectedUsers   = Map { userId   → socketId }
 *   connectedDrivers = Map { driverId → { socketId, lat, lng, vehicleType,
 *                                         isAvailable, isOnline, lastPing } }
 */

const { verifyToken } = require('../utils/generateToken')

// ── In-Memory Registries (Phase 2 & 3 will read from these) ──────────────────
const connectedUsers   = new Map()  // userId   → socketId
const connectedDrivers = new Map()  // driverId → driverEntry object

// ── Exports used by other modules ────────────────────────────────────────────
/**
 * Get the socket instance of a specific user by their DB _id string.
 * Returns null if the user is not currently connected.
 */
const getUserSocket = (io, userId) => {
  const socketId = connectedUsers.get(userId)
  return socketId ? io.sockets.sockets.get(socketId) : null
}

/**
 * Get the socket instance of a specific driver by their DB _id string.
 * Returns null if the driver is not currently connected.
 */
const getDriverSocket = (io, driverId) => {
  const entry = connectedDrivers.get(driverId)
  return entry ? io.sockets.sockets.get(entry.socketId) : null
}

/**
 * Retrieve the full in-memory driver registry.
 * Used by the matching algorithm in Phase 3.
 */
const getConnectedDrivers = () => connectedDrivers

/**
 * Emit to a specific user by their userId (not socketId).
 * Safely no-ops if user is offline.
 */
const emitToUser = (io, userId, event, payload) => {
  const userIdStr = String(userId)
  io.to(`user:${userIdStr}`).emit(event, payload)
  const socketId = connectedUsers.get(userIdStr)
  if (socketId) {
    io.to(socketId).emit(event, payload)
    return true
  }
  return false
}

/**
 * Emit to a specific driver by their driverId.
 * Safely emits to both driver room and direct socket if available.
 */
const emitToDriver = (io, driverId, payload_event, payload) => {
  const driverIdStr = String(driverId)
  io.to(`driver:${driverIdStr}`).emit(payload_event, payload)
  const entry = connectedDrivers.get(driverIdStr)
  if (entry && entry.socketId) {
    io.to(entry.socketId).emit(payload_event, payload)
    return true
  }
  return false
}

// ── Main Mount Function ───────────────────────────────────────────────────────
module.exports = function mountSocketManager(io) {

  // ── 1. JWT Authentication Middleware ─────────────────────────────────────
  // Runs before the 'connection' event for every new socket.
  io.use((socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token
      if (!rawToken) {
        return next(new Error('AUTH_REQUIRED: No token provided.'))
      }

      // Strip "Bearer " prefix if present
      const token = rawToken.startsWith('Bearer ')
        ? rawToken.slice(7)
        : rawToken

      const decoded = verifyToken(token)   // throws if invalid or expired
      socket.data.userId   = String(decoded.id)
      socket.data.role     = decoded.role  // 'user' | 'employee' | 'admin'
      socket.data.name     = decoded.name || 'Unknown'
      next()
    } catch (err) {
      console.warn('[Socket Auth Failed]', err.message)
      next(new Error('AUTH_FAILED: Invalid or expired token.'))
    }
  })

  // ── 2. Connection Handler ─────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const { userId, role } = socket.data
    console.log(`✅ [Socket] Connected  | ${role.padEnd(8)} | userId: ${userId} | socketId: ${socket.id}`)

    // ── Register in correct registry & join authenticated personal rooms ──
    if (role === 'employee') {
      socket.join(`driver:${userId}`)

      // Pre-seed in-memory entry
      connectedDrivers.set(userId, {
        socketId:    socket.id,
        lat:         null,
        lng:         null,
        vehicleType: null,
        isAvailable: false,
        isOnline:    false,
        lastPing:    Date.now(),
      })

      // Asynchronously seed authoritative state from MongoDB
      const Employee = require('../models/Employee')
      Employee.findById(userId)
        .select('onlineStatus availabilityStatus location currentLocation vehicleCategory vehicleNumber name')
        .then((emp) => {
          if (!emp) return
          const isOnline = emp.onlineStatus === 'ONLINE'
          const isAvailable = isOnline && emp.availabilityStatus === 'AVAILABLE'
          const lat = emp.currentLocation?.lat ?? emp.location?.coordinates?.[1] ?? null
          const lng = emp.currentLocation?.lng ?? emp.location?.coordinates?.[0] ?? null
          const currentEntry = connectedDrivers.get(userId) || {}

          connectedDrivers.set(userId, {
            ...currentEntry,
            socketId: socket.id,
            lat: lat ?? currentEntry.lat,
            lng: lng ?? currentEntry.lng,
            vehicleType: emp.vehicleCategory || currentEntry.vehicleType,
            isAvailable: isAvailable,
            isOnline: isOnline,
            lastPing: Date.now(),
          })
          console.log(`   [Driver Seeded] driverId: ${userId} | isOnline: ${isOnline} | lat: ${lat} | lng: ${lng}`)
        })
        .catch((err) => console.warn('[Socket Employee Seed]', err.message))
    } else {
      // 'user' or 'admin'
      socket.join(`user:${userId}`)
      connectedUsers.set(userId, socket.id)
    }

    // ── Emit connection confirmation back to client ───────────────────
    socket.emit('socket:connected', {
      socketId: socket.id,
      userId,
      role,
      timestamp: Date.now(),
    })

    // ── Broadcast online status for development debug ─────────────────
    console.log(`   [Registry] Users: ${connectedUsers.size} | Drivers: ${connectedDrivers.size}`)

    // ── Driver: Go Online ────────────────────────────────────────────────
    // Payload: { vehicleType: 'Scooty' | 'Moto' | 'Sedan' | ... }
    socket.on('driver:go_online', async ({ vehicleType } = {}) => {
      if (role !== 'employee') return
      const entry = connectedDrivers.get(userId) || {}
      connectedDrivers.set(userId, {
        ...entry,
        socketId:    socket.id,
        vehicleType: vehicleType || entry.vehicleType,
        isAvailable: true,
        isOnline:    true,
        lastPing:    Date.now(),
      })
      socket.emit('driver:status_update', { isOnline: true, isAvailable: true })
      console.log(`🟢 [Driver Online]  driverId: ${userId} | vehicle: ${vehicleType}`)

      // Persist to MongoDB authoritative state
      try {
        const Employee = require('../models/Employee')
        await Employee.findByIdAndUpdate(userId, {
          onlineStatus: 'ONLINE',
          availabilityStatus: 'AVAILABLE',
        })
      } catch (err) {
        console.error('[driver:go_online DB write]', err.message)
      }
    })

    // ── Driver: Go Offline ───────────────────────────────────────────────
    socket.on('driver:go_offline', async () => {
      if (role !== 'employee') return
      const entry = connectedDrivers.get(userId) || {}
      connectedDrivers.set(userId, {
        ...entry,
        isAvailable: false,
        isOnline:    false,
      })
      socket.emit('driver:status_update', { isOnline: false, isAvailable: false })
      console.log(`🔴 [Driver Offline] driverId: ${userId}`)

      // Persist to MongoDB authoritative state
      try {
        const Employee = require('../models/Employee')
        await Employee.findByIdAndUpdate(userId, {
          onlineStatus: 'OFFLINE',
        })
      } catch (err) {
        console.error('[driver:go_offline DB write]', err.message)
      }
    })

    // ── Driver: Location Update (GPS Streaming) ─────────────────────────
    // Payload: { lat, lng, heading, speed, activeRideId }
    socket.on('driver:location_update', (data) => {
      if (role !== 'employee') return
      const { lat, lng, heading, speed, activeRideId } = data || {}
      if (lat == null || lng == null) return

      const latN = Number(lat)
      const lngN = Number(lng)

      // Validate coordinates before writing — reject NaN, Infinity, out-of-range
      if (!isFinite(latN) || !isFinite(lngN)) return
      if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) return

      // 1. Update in-memory registry synchronously (keeps socket latency zero)
      const entry = connectedDrivers.get(userId) || {}
      connectedDrivers.set(userId, {
        ...entry,
        socketId: socket.id,
        lat:      latN,
        lng:      lngN,
        heading:  Number(heading) || 0,
        speed:    Number(speed) || 0,
        isOnline: true,
        lastPing: Date.now(),
      })

      // 2. Persist GPS to MongoDB — fire-and-forget (no await, zero added latency)
      //    Writes GeoJSON [lng, lat] to Employee.location for 2dsphere $near queries.
      const Employee = require('../models/Employee')
      Employee.findByIdAndUpdate(userId, {
        location: { type: 'Point', coordinates: [lngN, latN] },
        'currentLocation.lat':       latN,
        'currentLocation.lng':       lngN,
        'currentLocation.heading':   Number(heading) || 0,
        'currentLocation.speed':     Number(speed) || 0,
        'currentLocation.updatedAt': new Date(),
      }).catch((err) => console.error('[location_update DB write]', err.message))

      // 3. If assigned to an active ride, forward GPS to customer's ride room
      if (activeRideId) {
        io.to(`ride:${activeRideId}`).emit('driver:position', {
          driverId: userId,
          lat:      latN,
          lng:      lngN,
          heading:  Number(heading) || 0,
          speed:    Number(speed) || 0,
          timestamp: Date.now(),
        })
      }

      // 4. Broadcast available driver positions for real-time fleet map view
      io.emit('fleet:driver_location', {
        id:          userId,
        driverId:    userId,
        vehicleType: entry.vehicleType,
        lat:         latN,
        lng:         lngN,
        heading:     Number(heading) || 0,
        isAvailable: entry.isAvailable,
      })
    })

    // ── Fleet: Request Active Nearby Drivers ─────────────────────────────
    socket.on('fleet:get_nearby', async () => {
      const now = Date.now()
      const activeList = []
      const foundIds = new Set()

      for (const [id, d] of connectedDrivers.entries()) {
        // Consider driver active if online with coordinates and pinged within 60s
        if (d.isOnline && d.lat != null && d.lng != null && (now - (d.lastPing || 0) < 60000)) {
          activeList.push({
            id: String(id),
            driverId: String(id),
            vehicleType: d.vehicleType,
            lat: d.lat,
            lng: d.lng,
            heading: d.heading || 0,
            isAvailable: d.isAvailable,
          })
          foundIds.add(String(id))
        }
      }

      // Fallback query to MongoDB for persisted online drivers who may not have pinged yet
      try {
        const Employee = require('../models/Employee')
        const onlineDrivers = await Employee.find({
          onlineStatus: 'ONLINE',
          availabilityStatus: 'AVAILABLE',
          isActive: true,
          _id: { $nin: Array.from(foundIds) },
        }).select('vehicleCategory currentLocation location _id')

        for (const emp of onlineDrivers) {
          const lat = emp.currentLocation?.lat ?? emp.location?.coordinates?.[1]
          const lng = emp.currentLocation?.lng ?? emp.location?.coordinates?.[0]
          if (lat != null && lng != null) {
            activeList.push({
              id: String(emp._id),
              driverId: String(emp._id),
              vehicleType: emp.vehicleCategory,
              lat,
              lng,
              heading: emp.currentLocation?.heading || 0,
              isAvailable: true,
            })
          }
        }
      } catch (err) {
        // silent fallback
      }

      socket.emit('fleet:nearby_drivers', { drivers: activeList })
    })

    // ── Join a Ride Room (used by both customer and driver) ──────────────
    // Called by Phase 3 after a ride is accepted.
    // Payload: { rideId: string }
    socket.on('ride:join_room', ({ rideId }) => {
      if (!rideId) return
      socket.join(`ride:${rideId}`)
      console.log(`🚗 [Room Join] ${role} ${userId} joined ride:${rideId}`)
      socket.emit('ride:room_joined', { rideId })
    })

    // ── Leave a Ride Room ────────────────────────────────────────────────
    socket.on('ride:leave_room', ({ rideId }) => {
      if (!rideId) return
      socket.leave(`ride:${rideId}`)
      console.log(`🚪 [Room Leave] ${role} ${userId} left ride:${rideId}`)
    })

    // ── Ping / Heartbeat (keep-alive) ────────────────────────────────────
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() })
    })

    // ── Chat: Send Message (Phase 5 Hardened) ───────────────────────────
    // Payload: { rideId, message, senderName }
    socket.on('chat:send', async (data) => {
      const { rideId, message, senderName } = data || {}
      if (!rideId || !message?.trim()) return

      try {
        const ChatMessage = require('../models/ChatMessage')
        const Ride        = require('../models/Ride')
        const Parcel      = require('../models/Parcel')

        const senderDisplayName = senderName || socket.data.name || (role === 'employee' ? 'Driver' : 'Passenger')
        const senderRole = role === 'employee' ? 'driver' : 'customer'

        const saved = await ChatMessage.create({
          rideId: String(rideId),
          senderId: userId,
          senderName: senderDisplayName,
          senderRole,
          message: message.trim(),
        })

        const payload = {
          id:         String(saved._id),
          rideId:     saved.rideId,
          senderId:   saved.senderId,
          senderName: saved.senderName,
          senderRole: saved.senderRole,
          message:    saved.message,
          createdAt:  saved.createdAt,
        }

        // 1. Broadcast to everyone in the room
        io.to(`ride:${rideId}`).emit('chat:message', payload)

        // 2. Identify recipient and emit direct notification and direct chat message
        let recipientUserId = null
        let isDriverRecipient = false

        let rideDoc = null
        if (rideId.match(/^[0-9a-fA-F]{24}$/)) {
          rideDoc = await Ride.findById(rideId).select('customerId driverId customerName driverName')
        }
        if (!rideDoc) {
          rideDoc = await Ride.findOne({ bookingId: rideId }).select('customerId driverId customerName driverName')
        }

        if (rideDoc) {
          if (role === 'employee') {
            recipientUserId = String(rideDoc.customerId)
            isDriverRecipient = false
          } else {
            recipientUserId = rideDoc.driverId ? String(rideDoc.driverId) : null
            isDriverRecipient = true
          }
        } else {
          // Check Parcel
          const query = rideId.match(/^[0-9a-fA-F]{24}$/)
            ? { _id: rideId }
            : { trackingId: rideId }
          const parcelDoc = await Parcel.findOne(query).select('senderId courierId')
          if (parcelDoc) {
            if (role === 'employee') {
              recipientUserId = String(parcelDoc.senderId)
              isDriverRecipient = false
            } else {
              recipientUserId = parcelDoc.courierId ? String(parcelDoc.courierId) : null
              isDriverRecipient = true
            }
          }
        }

        // If recipient found and not sender, deliver direct notification
        if (recipientUserId && recipientUserId !== userId) {
          const notifPayload = {
            id: Date.now(),
            title: `💬 New message from ${senderDisplayName}`,
            body: message.trim().slice(0, 100),
            type: 'info',
            timestamp: new Date().toISOString(),
            read: false,
          }

          if (isDriverRecipient) {
            emitToDriver(io, recipientUserId, 'chat:message', payload)
            emitToDriver(io, recipientUserId, 'notification:new', notifPayload)
          } else {
            emitToUser(io, recipientUserId, 'chat:message', payload)
            emitToUser(io, recipientUserId, 'notification:new', notifPayload)
          }
        }

        console.log(`💬 [Chat] ${role} (${senderDisplayName}) → ride:${rideId}: "${message.trim().slice(0, 40)}"`)
      } catch (err) {
        console.error('[chat:send error]', err.message)
        socket.emit('chat:error', { message: 'Failed to send message.' })
      }
    })

    // ── Notifications: Push a notification to a specific user ────────────
    // Called internally by server-side logic; also usable via socket for admin
    socket.on('notification:send', ({ targetUserId, title, body, type }) => {
      if (role !== 'admin') return // Only admin can push custom notifications
      const targetSocket = connectedUsers.get(String(targetUserId))
      if (targetSocket) {
        io.to(targetSocket).emit('notification:new', {
          id: Date.now(),
          title,
          body,
          type: type || 'info',
          timestamp: new Date().toISOString(),
          read: false,
        })
      }
    })

    // ── Disconnect Handler ───────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`❌ [Socket] Disconnected | ${role.padEnd(8)} | userId: ${userId} | reason: ${reason}`)

      if (role === 'employee') {
        // Mark driver as offline but keep the entry so lastPing diff is detectable
        const entry = connectedDrivers.get(userId)
        if (entry) {
          connectedDrivers.set(userId, {
            ...entry,
            isAvailable: false,
            isOnline:    false,
          })
        }
      } else {
        connectedUsers.delete(userId)
      }

      console.log(`   [Registry] Users: ${connectedUsers.size} | Drivers: ${connectedDrivers.size}`)
    })
  })

  // ── 3. Expose helpers on the io instance for use in other controllers ────
  // e.g., rideController can call: req.app.get('io').emitToUser(...)
  io.emitToUser   = (userId, event, payload)   => emitToUser(io, userId, event, payload)
  io.emitToDriver = (driverId, event, payload) => emitToDriver(io, driverId, event, payload)
  io.getConnectedDrivers = () => getConnectedDrivers()
  io.getUserSocket   = (userId)   => getUserSocket(io, userId)
  io.getDriverSocket = (driverId) => getDriverSocket(io, driverId)

  // ── 4. Periodic timeout check: expire searching/requested rides after 2 minutes ────
  setInterval(async () => {
    try {
      const Ride = require('../models/Ride')
      const twoMinutesAgo = new Date(Date.now() - 120 * 1000)
      const expiredRides = await Ride.find({
        status: { $in: ['searching', 'requested'] },
        createdAt: { $lt: twoMinutesAgo },
      })
      for (const r of expiredRides) {
        r.status = 'expired'
        r.timeline.push({
          status: 'expired',
          timestamp: new Date(),
          note: 'Request timed out after waiting for driver response',
        })
        await r.save()
        io.emitToUser(String(r.customerId), 'ride:no_driver', {
          rideId: r._id,
          bookingId: r.bookingId,
          status: 'expired',
        })
        io.emitToUser(String(r.customerId), 'notification:new', {
          id: Date.now(),
          title: '⌛ Request Timed Out',
          body: 'We could not find an available driver in time. Please try booking again.',
          type: 'warning',
          timestamp: new Date().toISOString(),
          read: false,
        })
      }
    } catch (err) {
      // silent catch for background job
    }
  }, 15000)
}

// Export registries so Phase 3 (driverMatcher.js) can import directly
module.exports.connectedUsers   = connectedUsers
module.exports.connectedDrivers = connectedDrivers
module.exports.getConnectedDrivers = getConnectedDrivers
module.exports.emitToUser   = emitToUser
module.exports.emitToDriver = emitToDriver
