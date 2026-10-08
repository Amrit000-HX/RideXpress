const Ride = require('../models/Ride')
const User = require('../models/User')
const Employee = require('../models/Employee')
const { findNearestDriver, findEligibleNearbyDrivers } = require('../services/driverMatcher')
const { getConnectedDrivers } = require('../socket/socketManager')

/* ── Allowed status transitions ────────────────────────────────────────────── */
const VALID_TRANSITIONS = {
  searching:      ['requested', 'assigned', 'expired', 'cancelled', 'rejected'],
  requested:      ['assigned', 'searching', 'rejected', 'expired', 'cancelled'],
  assigned:       ['rider_arriving', 'rider_arrived', 'in_progress', 'cancelled'],
  rider_arriving: ['rider_arrived', 'in_progress', 'cancelled'],
  rider_arrived:  ['in_progress', 'cancelled'],
  in_progress:    ['completed', 'cancelled'],
  completed:      [],
  cancelled:      [],
  rejected:       [],
  expired:        [],
}

function canTransition(from, to) {
  return (VALID_TRANSITIONS[from] || []).includes(to)
}

/**
 * Safe helper to query a ride either by MongoDB ObjectId or human-readable bookingId
 */
function getRideFilter(id) {
  if (!id || typeof id !== 'string' || id === '[object Object]' || id === 'undefined' || id === 'null') {
    return null
  }
  const cleanId = String(id).trim()
  return cleanId.match(/^[0-9a-fA-F]{24}$/) ? { _id: cleanId } : { bookingId: cleanId }
}

/**
 * Safely inspects the driver's existing rides and reconciles state:
 * 1. An in_progress ride MUST have a valid startedAt. If marked in_progress but startedAt is missing,
 *    it was never validly started. If older than 30 mins, mark cancelled; if recent, revert to assigned.
 * 2. Any unstarted ride (assigned, rider_arriving, rider_arrived) that is older than 30 minutes
 *    is a stale/abandoned assignment from a prior session and should be marked cancelled.
 * 3. Legitimate active trips (status === 'in_progress' with startedAt) are PRESERVED and NEVER cancelled.
 * 4. Recent valid assignments (< 30 minutes old) are kept as 'assigned' awaiting driver arrival.
 * 5. Reconciles the Employee doc: if no active or recent assignment remains, reset availabilityStatus to 'AVAILABLE'
 *    and currentRideId to null.
 */
async function cleanupDriverStaleRides(driverId) {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

    const openRides = await Ride.find({
      driverId,
      status: { $in: ['assigned', 'rider_arriving', 'rider_arrived', 'in_progress'] }
    })

    let currentAssignedRideId = null

    for (const r of openRides) {
      if (r.status === 'in_progress') {
        if (!r.startedAt) {
          // In-progress without startedAt is invalid
          if (r.createdAt < thirtyMinutesAgo) {
            r.status = 'cancelled'
            r.cancelledBy = 'system'
            r.cancellationReason = 'Stale unstarted ride cancelled'
            r.cancelledAt = new Date()
            r.timeline.push({
              status: 'cancelled',
              timestamp: new Date(),
              note: 'Cancelled stale unstarted ride on driver session reconciliation'
            })
            await r.save()
          } else {
            // Fresh (<30m) but not yet validly started: revert to assigned
            r.status = 'assigned'
            await r.save()
            currentAssignedRideId = r._id
          }
        } else {
          // Legitimate in_progress ride with startedAt: PRESERVE AND DO NOT CANCEL
          currentAssignedRideId = r._id
        }
      } else if (['assigned', 'rider_arriving', 'rider_arrived'].includes(r.status)) {
        if (r.createdAt < thirtyMinutesAgo) {
          // Stale assignment from prior session older than 30 minutes: cancel it
          r.status = 'cancelled'
          r.cancelledBy = 'system'
          r.cancellationReason = 'Stale unstarted ride expired'
          r.cancelledAt = new Date()
          r.timeline.push({
            status: 'cancelled',
            timestamp: new Date(),
            note: 'Expired stale unstarted ride from prior session'
          })
          await r.save()
        } else {
          // Recent assignment: keep it
          currentAssignedRideId = r._id
        }
      }
    }

    // Update Employee document to match actual state
    const driver = await Employee.findById(driverId)
    if (driver) {
      if (currentAssignedRideId) {
        driver.currentRideId = currentAssignedRideId
        driver.availabilityStatus = 'BUSY'
      } else {
        driver.currentRideId = null
        if (driver.onlineStatus === 'ONLINE') {
          driver.availabilityStatus = 'AVAILABLE'
        }
      }
      await driver.save()
    }
  } catch (err) {
    console.error('[cleanupDriverStaleRides]', err)
  }
}


/**
 * Concurrency-safe timeout handler:
 * If a searching ride has not been accepted after timeout,
 * safely assigns the intentional standby/demo driver from MongoDB
 * (or expires if no driver exists), keeping DB, rider, and employee portal synchronized.
 */
async function handleRideSearchTimeout(rideId, io) {
  try {
    const currentRide = await Ride.findById(rideId)
    if (!currentRide || !['searching', 'requested'].includes(currentRide.status)) {
      return // Already assigned by a real driver or cancelled
    }

    console.log(`⏱️ [Ride Timeout] Executing fallback for ride ${currentRide.bookingId} (${rideId})`)

    // Look up the registered demo driver in MongoDB (guaranteed by autoSeed)
    let demoDriver = await Employee.findOne({ email: 'driver@ridexpress.com', isActive: true })
    if (!demoDriver) {
      demoDriver = await Employee.findOne({ role: 'employee', isActive: true })
    }

    if (demoDriver) {
      // Atomic conditional update ensures we NEVER overwrite an accepted ride
      const assigned = await Ride.findOneAndUpdate(
        {
          _id: rideId,
          status: { $in: ['searching', 'requested'] },
        },
        {
          $set: {
            status: 'assigned',
            driverId: demoDriver._id,
            driverName: demoDriver.name || 'Demo Driver',
            driverPhone: demoDriver.phone || '+91 98765 43210',
            driverVehicleNumber: demoDriver.vehicleNumber || 'MH 02 EQ 8492',
            driverRating: demoDriver.rating || 4.92,
            acceptedAt: new Date(),
          },
          $push: {
            timeline: {
              status: 'assigned',
              timestamp: new Date(),
              note: `Search timeout — auto-assigned to standby driver ${demoDriver.name}`,
            },
          },
        },
        { new: true }
      )

      if (!assigned) {
        console.log(`⏱️ [Ride Timeout] Ride ${rideId} was concurrently accepted. Skipping fallback.`)
        return
      }

      // Update employee availability in DB
      await Employee.findByIdAndUpdate(demoDriver._id, {
        availabilityStatus: 'BUSY',
        currentRideId: assigned._id,
      })

      const connectedDrivers = getConnectedDrivers()
      const entry = connectedDrivers.get(String(demoDriver._id))
      if (entry) {
        connectedDrivers.set(String(demoDriver._id), { ...entry, isAvailable: false })
      }

      if (io) {
        const acceptPayload = {
          rideId: assigned._id,
          bookingId: assigned.bookingId,
          status: 'assigned',
          driver: {
            id: String(demoDriver._id),
            name: demoDriver.name,
            phone: demoDriver.phone || '',
            vehicleNumber: assigned.driverVehicleNumber,
            vehicleType: assigned.vehicleType,
            rating: assigned.driverRating,
          },
        }

        // 1. Notify Customer
        io.to(`ride:${assigned._id}`).emit('ride:accepted', acceptPayload)
        io.to(`user:${assigned.customerId}`).emit('ride:accepted', acceptPayload)
        if (typeof io.emitToUser === 'function') {
          io.emitToUser(String(assigned.customerId), 'ride:accepted', acceptPayload)
          io.emitToUser(String(assigned.customerId), 'notification:new', {
            id: Date.now(),
            title: '✅ Driver Assigned!',
            body: `${demoDriver.name} is on the way to pick you up.`,
            type: 'success',
            timestamp: new Date().toISOString(),
            read: false,
          })
        }

        // 2. Notify Employee/Driver Portal
        io.to(`driver:${demoDriver._id}`).emit('driver:assigned_ride', assigned)
        if (typeof io.emitToDriver === 'function') {
          io.emitToDriver(String(demoDriver._id), 'driver:assigned_ride', assigned)
          io.emitToDriver(String(demoDriver._id), 'notification:new', {
            id: Date.now() + 1,
            title: '🎯 Ride Assigned',
            body: `Ride ${assigned.bookingId} assigned to you for ${assigned.customerName}.`,
            type: 'info',
            timestamp: new Date().toISOString(),
            read: false,
          })
        }

        // 3. Remove from other drivers
        if (typeof io.emit === 'function') {
          io.emit('ride:unavailable', { rideId: String(assigned._id) })
        }
      }

      console.log(`✅ [Ride Timeout] Fallback assignment completed: Ride ${assigned.bookingId} -> Driver ${demoDriver.name} (${demoDriver._id})`)
    } else {
      // No employee found in system — mark expired
      const expired = await Ride.findOneAndUpdate(
        { _id: rideId, status: { $in: ['searching', 'requested'] } },
        {
          $set: { status: 'expired' },
          $push: {
            timeline: {
              status: 'expired',
              timestamp: new Date(),
              note: 'Search timed out — no drivers available in the system',
            },
          },
        },
        { new: true }
      )
      if (expired && io) {
        io.emitToUser(String(expired.customerId), 'ride:no_driver', {
          rideId: expired._id,
          bookingId: expired.bookingId,
          status: 'expired',
        })
      }
    }
  } catch (err) {
    console.error('[handleRideSearchTimeout]', err)
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/rides   — Create & Broadcast Ride to Nearby Drivers
   ═══════════════════════════════════════════════════════════════ */
exports.createRide = async (req, res) => {
  try {
    const {
      vehicleType,
      vehicleId,
      pickup,
      drop,
      distanceKm,
      estimatedMinutes,
      estimatedFare,
      paymentMethod,
      notes,
    } = req.body

    // ── Validation ────────────────────────────────────────────
    if (!vehicleType) {
      return res.status(400).json({ success: false, message: 'Vehicle type is required.' })
    }
    if (!pickup?.address || pickup?.lat == null || pickup?.lng == null) {
      return res.status(400).json({ success: false, message: 'Valid pickup location is required.' })
    }
    if (!drop?.address || drop?.lat == null || drop?.lng == null) {
      return res.status(400).json({ success: false, message: 'Valid drop location is required.' })
    }

    const customerUser = await User.findById(req.user.id).select('name phone email')
    const customerName  = customerUser?.name || 'Customer'
    const customerPhone = customerUser?.phone || ''
    const customerEmail = customerUser?.email || ''

    const bookingId = `RX-RIDE-${Math.floor(100000 + Math.random() * 900000)}`
    const startRidePin = Math.floor(1000 + Math.random() * 9000).toString()

    // ── Itemized Fare Breakdown ───────────────────────────────
    const total = Number(estimatedFare) || 280
    const baseFare = Math.round(total * 0.25)
    const distanceFare = Math.round(total * 0.65)
    const serviceFee = 15
    const taxAmount = Math.max(0, total - baseFare - distanceFare - serviceFee)

    const fareBreakdown = {
      baseFare,
      distanceFare,
      serviceFee,
      taxAmount,
      totalFare: total,
    }

    // ── 1. Save Ride in DB in 'searching' state (driverId: null) ──
    const ride = await Ride.create({
      bookingId,
      customerId: req.user.id,
      customerName,
      customerEmail,
      customerPhone,
      driverId: null,
      driverName: '',
      driverPhone: '',
      driverVehicleNumber: '',
      driverRating: 4.9,
      vehicleType,
      vehicleId: vehicleId || vehicleType.toLowerCase(),
      pickup: {
        address: pickup.address,
        lat: Number(pickup.lat),
        lng: Number(pickup.lng),
      },
      drop: {
        address: drop.address,
        lat: Number(drop.lat),
        lng: Number(drop.lng),
      },
      distanceKm: Number(distanceKm) || 5.8,
      estimatedMinutes: Number(estimatedMinutes) || 0,
      notes: notes || '',
      estimatedFare: total,
      actualFare: total,
      fareBreakdown,
      paymentMethod: paymentMethod || 'Cash on Delivery / UPI',
      paymentStatus: 'pending',
      startRidePin,
      status: 'searching',
      bookedAt: new Date(),
      acceptedAt: null,
      timeline: [
        {
          status: 'searching',
          timestamp: new Date(),
          note: 'Ride requested by customer — searching for nearby drivers',
        },
      ],
    })

    // ── 2. Discover All Eligible Nearby Drivers ───────────────
    const eligibleDrivers = await findEligibleNearbyDrivers({
      pickupLat: Number(pickup.lat),
      pickupLng: Number(pickup.lng),
      vehicleType,
      limit: 10,
    })

    console.log(
      `🔍 [Driver Search] Ride ${ride.bookingId} (${ride._id}) | Vehicle: ${vehicleType} | Pickup: [${pickup.lat}, ${pickup.lng}] | Found: ${eligibleDrivers.length} eligible driver(s)`
    )

    // ── 3. Real-Time Broadcast Dispatch to All Eligible Drivers ──
    const io = req.app.get('io')
    let notifiedCount = 0

    if (io) {
      const dispatchPayload = {
        rideId: ride._id,
        bookingId: ride.bookingId,
        customerName,
        customerEmail,
        customerPhone,
        pickup: ride.pickup,
        drop: ride.drop,
        distanceKm: ride.distanceKm,
        estimatedMinutes: ride.estimatedMinutes,
        estimatedFare: ride.estimatedFare,
        vehicleType: ride.vehicleType,
        notes: ride.notes,
        timeoutSeconds: 30,
      }

      if (eligibleDrivers.length > 0) {
        // Broadcast simultaneously to every connected eligible driver
        for (const driver of eligibleDrivers) {
          if (driver.socketId) {
            io.to(driver.socketId).emit('ride:incoming_request', dispatchPayload)
          }
          io.to(`driver:${driver.driverId}`).emit('ride:incoming_request', dispatchPayload)
          notifiedCount++
        }
      }

      // Also broadcast to drivers' available requests feed
      io.emit('ride:new_available', dispatchPayload)

      // Notify customer that search has started
      io.emitToUser(String(req.user.id), 'notification:new', {
        id: Date.now(),
        title: '🔍 Searching for a driver…',
        body: notifiedCount > 0
          ? `Broadcasting to ${notifiedCount} nearby driver${notifiedCount > 1 ? 's' : ''}. Please wait.`
          : 'Searching for the best driver near you. Please wait.',
        type: 'info',
        timestamp: new Date().toISOString(),
        read: false,
      })

      // ── 4. Schedule Concurrency-Safe Demo Driver Fallback Timeout ──
      setTimeout(async () => {
        try {
          await handleRideSearchTimeout(ride._id, io)
        } catch (tErr) {
          console.error('[handleRideSearchTimeout err]', tErr.message)
        }
      }, 30000)
    }

    return res.status(201).json({
      success: true,
      message: 'Ride request created. Searching for nearby drivers.',
      ride: {
        _id: ride._id,
        id: ride._id,
        bookingId: ride.bookingId,
        customer: {
          id: ride.customerId,
          name: ride.customerName,
          email: ride.customerEmail,
          phone: ride.customerPhone,
        },
        vehicleType: ride.vehicleType,
        pickup: ride.pickup,
        drop: ride.drop,
        distanceKm: ride.distanceKm,
        estimatedMinutes: ride.estimatedMinutes,
        estimatedFare: ride.estimatedFare,
        actualFare: ride.actualFare,
        fareBreakdown: ride.fareBreakdown,
        paymentMethod: ride.paymentMethod,
        paymentStatus: ride.paymentStatus,
        startRidePin: ride.startRidePin,
        notes: ride.notes,
        driver: null,
        status: ride.status,
        bookedAt: ride.bookedAt,
      },
    })
  } catch (err) {
    console.error('[createRide]', err)
    res.status(500).json({ success: false, message: 'Server error during ride creation.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/rides/:id/accept   — Atomic Driver Acceptance
   ═══════════════════════════════════════════════════════════════ */
exports.acceptRide = async (req, res) => {
  try {
    const { id } = req.params

    // 1. Fetch driver profile for authoritative details
    const driverProfile = await Employee.findById(req.user.id)
      .select('name phone vehicleCategory vehicleNumber rating employeeId onlineStatus availabilityStatus')

    if (!driverProfile) {
      return res.status(403).json({ success: false, message: 'Driver profile not found.' })
    }

    // 2. Atomic Conditional Update: Only one driver can succeed
    // Matches ONLY if ride status is still 'searching' or 'requested'
    const rideFilter = getRideFilter(id)
    if (!rideFilter) {
      return res.status(400).json({ success: false, message: 'Invalid ride ID provided.' })
    }
    const updated = await Ride.findOneAndUpdate(
      {
        ...rideFilter,
        status: { $in: ['searching', 'requested'] },
      },
      {
        $set: {
          status: 'assigned',
          driverId: req.user.id,
          driverName: driverProfile.name || req.user.name || 'Driver',
          driverPhone: driverProfile.phone || '',
          driverVehicleNumber: driverProfile.vehicleNumber || 'MH 02 EQ 8492',
          driverRating: driverProfile.rating || 4.92,
          acceptedAt: new Date(),
        },
        $push: {
          timeline: {
            status: 'assigned',
            timestamp: new Date(),
            note: `Ride accepted by driver ${driverProfile.name || req.user.id}`,
          },
        },
      },
      { new: true }
    )

    // If null, another driver already accepted or ride was cancelled/expired
    if (!updated) {
      return res.status(409).json({
        success: false,
        message: 'This ride was already accepted by another driver or is no longer available.',
      })
    }

    // 3. Update Driver Availability in DB and in-memory registry
    await Employee.findByIdAndUpdate(req.user.id, {
      availabilityStatus: 'BUSY',
      currentRideId: updated._id,
    })

    const connectedDrivers = getConnectedDrivers()
    const entry = connectedDrivers.get(String(req.user.id))
    if (entry) {
      connectedDrivers.set(String(req.user.id), { ...entry, isAvailable: false })
    }

    const io = req.app.get('io')
    if (io) {
      // 4. Notify Customer that Driver has Accepted (Real-time update)
      const acceptPayload = {
        rideId: updated._id,
        bookingId: updated.bookingId,
        status: 'assigned',
        driver: {
          id: req.user.id,
          name: driverProfile.name || req.user.name,
          phone: driverProfile.phone || '',
          vehicleNumber: updated.driverVehicleNumber,
          vehicleType: updated.vehicleType,
          rating: updated.driverRating,
        },
      }

      if (typeof io.emitToUser === 'function') {
        io.emitToUser(String(updated.customerId), 'ride:accepted', acceptPayload)
        io.emitToUser(String(updated.customerId), 'notification:new', {
          id: Date.now(),
          title: '✅ Driver Accepted!',
          body: `${driverProfile.name || 'Your driver'} has accepted your ride and is heading to you.`,
          type: 'success',
          timestamp: new Date().toISOString(),
          read: false,
        })
      }
      io.to(`ride:${updated._id}`).emit('ride:accepted', acceptPayload)
      io.to(`user:${updated.customerId}`).emit('ride:accepted', acceptPayload)

      // 5. Notify the winning driver
      io.to(`driver:${req.user.id}`).emit('driver:assigned_ride', updated)
      if (typeof io.emitToDriver === 'function') {
        io.emitToDriver(String(req.user.id), 'driver:assigned_ride', updated)
        io.emitToDriver(String(req.user.id), 'notification:new', {
          id: Date.now() + 1,
          title: '🎯 Ride Accepted',
          body: `You accepted the ride for ${updated.customerName}. Head to pickup: ${updated.pickup?.address || 'Pickup point'}`,
          type: 'success',
          timestamp: new Date().toISOString(),
          read: false,
        })
      }

      // 6. Broadcast to all other drivers that this ride is now taken (dismiss modal)
      io.emit('ride:unavailable', { rideId: String(updated._id) })
    }

    return res.status(200).json({ success: true, message: 'Ride accepted successfully.', ride: updated })
  } catch (err) {
    console.error('[acceptRide]', err)
    res.status(500).json({ success: false, message: err.message || 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/rides/:id/reject   — Driver Rejects Ride Request
   ═══════════════════════════════════════════════════════════════ */
exports.rejectRide = async (req, res) => {
  try {
    const { id } = req.params
    const ride = await Ride.findById(id)
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' })

    if (!['searching', 'requested'].includes(ride.status)) {
      return res.status(409).json({
        success: false,
        message: `Ride cannot be rejected in status '${ride.status}'.`,
      })
    }

    // Record rejection by this specific driver without affecting other drivers
    if (!ride.rejectedBy.some(id => String(id) === String(req.user.id))) {
      ride.rejectedBy.push(req.user.id)
    }
    ride.timeline.push({
      status: 'searching',
      timestamp: new Date(),
      note: `Declined by driver ${req.user.name || req.user.id}`,
    })

    await ride.save()

    const io = req.app.get('io')
    if (io) {
      // Remove this ride specifically from the rejecting driver's UI
      io.to(`driver:${req.user.id}`).emit('ride:unavailable', { rideId: String(ride._id) })
      io.emitToDriver(String(req.user.id), 'ride:unavailable', { rideId: String(ride._id) })
    }

    return res.status(200).json({ success: true, message: 'Ride declined.' })
  } catch (err) {
    console.error('[rejectRide]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/rides/:id/cancel   — User OR Driver Cancels Ride
   ═══════════════════════════════════════════════════════════════ */
exports.cancelRide = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const rideFilter = getRideFilter(id)
    const ride = await Ride.findOne(rideFilter)
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' })

    const isUser   = req.user.role === 'user'
    const isDriver = req.user.role === 'employee'

    // Ownership check: user can only cancel their own ride; driver can only cancel their assigned ride
    if (isUser && String(ride.customerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this ride.' })
    }
    if (isDriver && ride.driverId && String(ride.driverId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this ride.' })
    }

    // Status check: only cancellable while not completed or already cancelled
    const cancellableStatuses = ['searching', 'requested', 'assigned', 'rider_arriving', 'rider_arrived', 'in_progress']
    if (!cancellableStatuses.includes(ride.status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot cancel a ride with status '${ride.status}'.`,
      })
    }

    const cancelledBy = isUser ? 'user' : isDriver ? 'rider' : 'system'

    ride.status = 'cancelled'
    ride.cancelledBy = cancelledBy
    ride.cancellationReason = reason || ''
    ride.cancelledAt = new Date()
    ride.timeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: `Cancelled by ${cancelledBy}${reason ? `: ${reason}` : ''}`,
    })
    await ride.save()

    // Free driver in DB and in RAM registry
    if (ride.driverId) {
      await Employee.findByIdAndUpdate(ride.driverId, {
        availabilityStatus: 'AVAILABLE',
        currentRideId: null,
      })
      const connectedDrivers = getConnectedDrivers()
      const entry = connectedDrivers.get(String(ride.driverId))
      if (entry) {
        connectedDrivers.set(String(ride.driverId), { ...entry, isAvailable: true })
      }
    }

    const io = req.app.get('io')
    if (io) {
      const cancelPayload = {
        rideId: ride._id,
        bookingId: ride.bookingId,
        cancelledBy,
        reason: reason || '',
      }

      if (typeof io.emitToUser === 'function') {
        io.emitToUser(String(ride.customerId), 'ride:cancelled', cancelPayload)
      }
      io.to(`ride:${ride._id}`).emit('ride:cancelled', cancelPayload)
      io.to(`user:${ride.customerId}`).emit('ride:cancelled', cancelPayload)

      if (ride.driverId) {
        if (typeof io.emitToDriver === 'function') {
          io.emitToDriver(String(ride.driverId), 'ride:cancelled', cancelPayload)
        }
        io.to(`driver:${ride.driverId}`).emit('ride:cancelled', cancelPayload)
      }

      const notifMsg = cancelledBy === 'user'
        ? 'Your ride has been cancelled.'
        : 'The driver cancelled your ride.'

      if (cancelledBy !== 'user') {
        if (typeof io.emitToUser === 'function') {
          io.emitToUser(String(ride.customerId), 'notification:new', {
            id: Date.now(),
            title: '❌ Ride Cancelled',
            body: notifMsg + (reason ? ` Reason: ${reason}` : ''),
            type: 'error',
            timestamp: new Date().toISOString(),
            read: false,
          })
        }
      }
      if (cancelledBy !== 'rider' && ride.driverId) {
        if (typeof io.emitToDriver === 'function') {
          io.emitToDriver(String(ride.driverId), 'notification:new', {
            id: Date.now() + 1,
            title: '❌ Ride Cancelled by Passenger',
            body: `${ride.customerName} cancelled the ride.`,
            type: 'warning',
            timestamp: new Date().toISOString(),
            read: false,
          })
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Ride cancelled successfully.', ride })
  } catch (err) {
    console.error('[cancelRide]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/rides/:id/arrived   — Driver Arrived at Pickup
   ═══════════════════════════════════════════════════════════════ */
exports.markArrived = async (req, res) => {
  try {
    const { id } = req.params
    const rideFilter = getRideFilter(id)
    const ride = await Ride.findOne(rideFilter)
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' })

    if (String(ride.driverId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Only the assigned driver can mark arrival.' })
    }

    if (ride.status === 'rider_arrived') {
      return res.status(200).json({ success: true, message: 'Driver already marked as arrived.', ride })
    }

    if (!canTransition(ride.status, 'rider_arrived')) {
      return res.status(409).json({
        success: false,
        message: `Cannot mark arrived from status '${ride.status}'.`,
      })
    }

    ride.status = 'rider_arrived'
    ride.arrivedAt = new Date()
    ride.timeline.push({
      status: 'rider_arrived',
      timestamp: new Date(),
      note: `Driver ${req.user.name || req.user.id} arrived at pickup`,
    })
    await ride.save()

    const io = req.app.get('io')
    if (io) {
      const arrivedPayload = {
        rideId: ride._id,
        bookingId: ride.bookingId,
        status: 'rider_arrived',
        arrivedAt: ride.arrivedAt,
      }
      if (typeof io.emitToUser === 'function') {
        io.emitToUser(String(ride.customerId), 'ride:status_changed', arrivedPayload)
        io.emitToUser(String(ride.customerId), 'notification:new', {
          id: Date.now(),
          title: '📍 Driver Arrived!',
          body: `${ride.driverName} has arrived at your pickup location. Please share your 4-digit PIN upon boarding.`,
          type: 'success',
          timestamp: new Date().toISOString(),
          read: false,
        })
      }
      io.to(`ride:${ride._id}`).emit('ride:status_changed', arrivedPayload)
      io.to(`user:${ride.customerId}`).emit('ride:status_changed', arrivedPayload)
    }

    return res.status(200).json({ success: true, message: 'Marked as arrived at pickup.', ride })
  } catch (err) {
    console.error('[markArrived]', err)
    res.status(500).json({ success: false, message: err.message || 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/rides/:id/start   — Driver Starts the Ride with Mandatory PIN
   ═══════════════════════════════════════════════════════════════ */
exports.startRide = async (req, res) => {
  try {
    const { id } = req.params
    const { pin } = req.body
    const rideFilter = getRideFilter(id)
    const ride = await Ride.findOne(rideFilter)
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' })

    if (String(ride.driverId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Only the assigned driver can start the ride.' })
    }

    if (ride.status === 'in_progress') {
      return res.status(200).json({ success: true, message: 'Ride is already in progress.', ride })
    }

    const allowedFromStatuses = ['assigned', 'rider_arriving', 'rider_arrived']
    if (!allowedFromStatuses.includes(ride.status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot start ride from status '${ride.status}'.`,
      })
    }

    // MANDATORY PIN verification:
    if (ride.startRidePin) {
      if (!pin || String(pin).trim() !== String(ride.startRidePin).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or missing start PIN. Please ask the passenger for their 4-digit PIN.',
        })
      }
    }

    ride.status = 'in_progress'
    ride.startedAt = new Date()
    ride.timeline.push({
      status: 'in_progress',
      timestamp: new Date(),
      note: `Ride started after verified start PIN by driver ${req.user.name || req.user.id}`,
    })
    await ride.save()

    const io = req.app.get('io')
    if (io) {
      const startPayload = {
        rideId: ride._id,
        bookingId: ride.bookingId,
        status: 'in_progress',
        startedAt: ride.startedAt,
      }
      if (typeof io.emitToUser === 'function') {
        io.emitToUser(String(ride.customerId), 'ride:status_changed', startPayload)
        io.emitToUser(String(ride.customerId), 'notification:new', {
          id: Date.now(),
          title: '🚀 Ride Started!',
          body: `Your ride to ${ride.drop?.address || 'destination'} has begun.`,
          type: 'info',
          timestamp: new Date().toISOString(),
          read: false,
        })
      }
      io.to(`ride:${ride._id}`).emit('ride:status_changed', startPayload)
      io.to(`user:${ride.customerId}`).emit('ride:status_changed', startPayload)
    }

    return res.status(200).json({ success: true, message: 'Ride started successfully.', ride })
  } catch (err) {
    console.error('[startRide]', err)
    res.status(500).json({ success: false, message: err.message || 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/rides/:id/complete   — Driver Completes Ride
   ═══════════════════════════════════════════════════════════════ */
exports.completeRide = async (req, res) => {
  try {
    const { id } = req.params
    const rideFilter = getRideFilter(id)
    const ride = await Ride.findOne(rideFilter)
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' })

    if (String(ride.driverId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Only the assigned driver can complete the ride.' })
    }

    if (ride.status === 'completed') {
      return res.status(200).json({ success: true, message: 'Ride is already completed.', ride })
    }

    if (ride.status !== 'in_progress') {
      return res.status(409).json({
        success: false,
        message: `Cannot complete ride with status '${ride.status}'. Ride must be in progress.`,
      })
    }

    ride.status = 'completed'
    ride.completedAt = new Date()
    ride.paymentStatus = 'completed'
    ride.timeline.push({
      status: 'completed',
      timestamp: new Date(),
      note: 'Trip completed safely and payment registered',
    })
    await ride.save()

    // Free driver in DB and in RAM registry
    await Employee.findByIdAndUpdate(req.user.id, {
      availabilityStatus: 'AVAILABLE',
      currentRideId: null,
    })
    const connectedDrivers = getConnectedDrivers()
    const entry = connectedDrivers.get(String(req.user.id))
    if (entry) {
      connectedDrivers.set(String(req.user.id), { ...entry, isAvailable: true })
    }

    const io = req.app.get('io')
    if (io) {
      const completedPayload = {
        rideId: ride._id,
        bookingId: ride.bookingId,
        status: 'completed',
        completedAt: ride.completedAt,
        finalFare: ride.actualFare || ride.estimatedFare,
      }
      if (typeof io.emitToUser === 'function') {
        io.emitToUser(String(ride.customerId), 'ride:status_changed', completedPayload)
        io.emitToUser(String(ride.customerId), 'notification:new', {
          id: Date.now(),
          title: '🏁 Ride Completed!',
          body: `You arrived safely! Total Fare: ₹${ride.actualFare || ride.estimatedFare}. Thank you for riding with RideXpress!`,
          type: 'success',
          timestamp: new Date().toISOString(),
          read: false,
        })
      }
      io.to(`ride:${ride._id}`).emit('ride:status_changed', completedPayload)
      io.to(`user:${ride.customerId}`).emit('ride:status_changed', completedPayload)

      // Notify driver
      if (typeof io.emitToDriver === 'function') {
        io.emitToDriver(String(req.user.id), 'notification:new', {
          id: Date.now() + 1,
          title: '💵 Ride Earnings Credited',
          body: `Trip completed for ${ride.customerName}. ₹${ride.actualFare || ride.estimatedFare} added to your earnings.`,
          type: 'success',
          timestamp: new Date().toISOString(),
          read: false,
        })
      }
    }

    return res.status(200).json({ success: true, message: 'Ride completed successfully.', ride })
  } catch (err) {
    console.error('[completeRide]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/rides/:id   — Single Ride Details (by Mongo ID or Booking ID)
   ═══════════════════════════════════════════════════════════════ */
exports.getRideById = async (req, res) => {
  try {
    const { id } = req.params
    let ride = null

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      ride = await Ride.findById(id).populate('customerId', 'name email phone').populate('driverId', 'name phone vehicleCategory employeeId')
    } else {
      ride = await Ride.findOne({ bookingId: id }).populate('customerId', 'name email phone').populate('driverId', 'name phone vehicleCategory employeeId')
    }

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found.' })
    }

    // Authorization: user can only view their own ride; driver can only view assigned ride; admin sees all
    if (req.user.role === 'user' && String(ride.customerId._id || ride.customerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this ride.' })
    }
    if (req.user.role === 'employee' && ride.driverId && String(ride.driverId._id || ride.driverId) !== String(req.user.id)) {
      // Driver can view available/searching rides but not someone else's active ride
      if (!['searching', 'requested'].includes(ride.status)) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this ride.' })
      }
    }

    return res.status(200).json({ success: true, ride })
  } catch (err) {
    console.error('[getRideById]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/rides/my-rides   — Customer Ride History
   ═══════════════════════════════════════════════════════════════ */
exports.getMyRides = async (req, res) => {
  try {
    const rides = await Ride.find({ customerId: req.user.id }).sort({ createdAt: -1 }).limit(50)
    return res.status(200).json({ success: true, count: rides.length, rides })
  } catch (err) {
    console.error('[getMyRides]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/rides/active   — Customer's current active ride
   ═══════════════════════════════════════════════════════════════ */
exports.getActiveRide = async (req, res) => {
  try {
    const activeStatuses = ['searching', 'requested', 'assigned', 'rider_arriving', 'rider_arrived', 'in_progress']
    const ride = await Ride.findOne({
      customerId: req.user.id,
      status: { $in: activeStatuses },
    }).sort({ createdAt: -1 })

    return res.status(200).json({ success: true, ride: ride || null })
  } catch (err) {
    console.error('[getActiveRide]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/rides/driver-history   — Driver's Past & Completed Rides
   ═══════════════════════════════════════════════════════════════ */
exports.getDriverRides = async (req, res) => {
  try {
    const rides = await Ride.find({ driverId: req.user.id }).sort({ createdAt: -1 }).limit(50)

    const completedRides = rides.filter((r) => r.status === 'completed')
    const cancelledRides = rides.filter((r) => r.status === 'cancelled')
    const totalEarnings  = completedRides.reduce((sum, r) => sum + (r.actualFare || r.estimatedFare || 0), 0)

    // Today
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEarnings = completedRides
      .filter((r) => r.completedAt && r.completedAt >= todayStart)
      .reduce((sum, r) => sum + (r.actualFare || r.estimatedFare || 0), 0)

    // This week
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7)
    const weekEarnings = completedRides
      .filter((r) => r.completedAt && r.completedAt >= weekStart)
      .reduce((sum, r) => sum + (r.actualFare || r.estimatedFare || 0), 0)

    return res.status(200).json({
      success: true,
      count: rides.length,
      totalEarnings,
      todayEarnings,
      weekEarnings,
      totalRides: rides.length,
      completedRides: completedRides.length,
      cancelledRides: cancelledRides.length,
      rides,
    })
  } catch (err) {
    console.error('[getDriverRides]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/rides/available   — Open Requests for Drivers
   ═══════════════════════════════════════════════════════════════ */
exports.getAvailableRides = async (req, res) => {
  try {
    const rides = await Ride.find({
      status: { $in: ['requested', 'searching'] },
      rejectedBy: { $ne: req.user.id },
    })
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(20)

    return res.status(200).json({ success: true, rides })
  } catch (err) {
    console.error('[getAvailableRides]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/rides/driver-active   — Driver's currently active ride
   ═══════════════════════════════════════════════════════════════ */
exports.getDriverActiveRide = async (req, res) => {
  try {
    await cleanupDriverStaleRides(req.user.id)

    const activeStatuses = ['assigned', 'rider_arriving', 'rider_arrived', 'in_progress']
    const ride = await Ride.findOne({
      driverId: req.user.id,
      status: { $in: activeStatuses },
    }).sort({ createdAt: -1 })

    return res.status(200).json({ success: true, ride: ride || null })
  } catch (err) {
    console.error('[getDriverActiveRide]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/rides/all   — Admin: All Rides
   ═══════════════════════════════════════════════════════════════ */
exports.getAllRides = async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query
    const filter = status ? { status } : {}
    const rides = await Ride.find(filter)
      .populate('customerId', 'name email phone')
      .populate('driverId', 'name phone vehicleCategory employeeId')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
    const total = await Ride.countDocuments(filter)
    return res.status(200).json({ success: true, total, count: rides.length, rides })
  } catch (err) {
    console.error('[getAllRides]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

exports.handleRideSearchTimeout = handleRideSearchTimeout
exports.cleanupDriverStaleRides = cleanupDriverStaleRides


