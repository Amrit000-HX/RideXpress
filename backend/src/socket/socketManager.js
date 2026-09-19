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
  const socketId = connectedUsers.get(String(userId))
  if (socketId) {
    io.to(socketId).emit(event, payload)
    return true
  }
  return false
}

/**
 * Emit to a specific driver by their driverId.
 * Safely no-ops if driver is offline.
 */
const emitToDriver = (io, driverId, payload_event, payload) => {
  const entry = connectedDrivers.get(String(driverId))
  if (entry) {
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

    // ── Register in correct registry ────────────────────────────────────
    if (role === 'employee') {
      connectedDrivers.set(userId, {
        socketId:    socket.id,
        lat:         null,
        lng:         null,
        vehicleType: null,
        isAvailable: false,   // driver must explicitly go "online"
        isOnline:    false,
        lastPing:    null,
      })
    } else {
      // 'user' or 'admin'
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
    socket.on('driver:go_online', ({ vehicleType } = {}) => {
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
    })

    // ── Driver: Go Offline ───────────────────────────────────────────────
    socket.on('driver:go_offline', () => {
      if (role !== 'employee') return
      const entry = connectedDrivers.get(userId) || {}
      connectedDrivers.set(userId, {
        ...entry,
        isAvailable: false,
        isOnline:    false,
      })
      socket.emit('driver:status_update', { isOnline: false, isAvailable: false })
      console.log(`🔴 [Driver Offline] driverId: ${userId}`)
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
}

// Export registries so Phase 3 (driverMatcher.js) can import directly
module.exports.connectedUsers   = connectedUsers
module.exports.connectedDrivers = connectedDrivers
module.exports.getConnectedDrivers = getConnectedDrivers
module.exports.emitToUser   = emitToUser
module.exports.emitToDriver = emitToDriver
