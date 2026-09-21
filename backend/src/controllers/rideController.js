const Ride = require('../models/Ride')
const User = require('../models/User')
const { findNearestDriver } = require('../services/driverMatcher')
const { getConnectedDrivers } = require('../socket/socketManager')

/* ═══════════════════════════════════════════════════════════════
   POST /api/rides   — Create & Auto-Match Ride with Nearest Driver
   ═══════════════════════════════════════════════════════════════ */
exports.createRide = async (req, res) => {
  try {
    const { vehicleType, vehicleId, pickup, drop, distanceKm, estimatedFare } = req.body

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
    const customerName = customerUser?.name || 'Customer'
    const customerPhone = customerUser?.phone || '+91 98765 43210'

    // ── Proximity Matching: Find Nearest Available Driver ────
    const matchedDriver = await findNearestDriver({
      pickupLat: Number(pickup.lat),
      pickupLng: Number(pickup.lng),
      vehicleType,
    })

    const bookingId = `RX-RIDE-${Math.floor(100000 + Math.random() * 900000)}`
    const startRidePin = Math.floor(1000 + Math.random() * 9000).toString()

    // ── Save Ride in DB ───────────────────────────────────────
    const ride = await Ride.create({
      bookingId,
      customerId: req.user.id,
      customerName,
      customerPhone,
      driverId: matchedDriver ? matchedDriver.driverId : null,
      driverName: matchedDriver ? matchedDriver.name : 'Arjun Mehta',
      driverPhone: matchedDriver ? matchedDriver.phone : '+91 98451 23098',
      driverVehicleNumber: matchedDriver ? matchedDriver.vehicleNumber : 'MH 02 EQ 8492',
      driverRating: matchedDriver ? matchedDriver.rating : 4.94,
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
      estimatedFare: Number(estimatedFare) || 280,
      startRidePin,
      status: matchedDriver ? 'assigned' : 'requested',
    })

    // ── Real-Time Socket Dispatch ─────────────────────────────
    const io = req.app.get('io')
    if (io && matchedDriver && matchedDriver.socketId) {
      // 1. Send incoming ride request directly to the matched driver's screen
      io.to(matchedDriver.socketId).emit('ride:incoming_request', {
        rideId: ride._id,
        bookingId: ride.bookingId,
        customerName,
        customerPhone,
        pickup: ride.pickup,
        drop: ride.drop,
        distanceKm: ride.distanceKm,
        estimatedFare: ride.estimatedFare,
        startRidePin: ride.startRidePin,
        vehicleType: ride.vehicleType,
        timeoutSeconds: 30,
      })

      // Mark driver as occupied in RAM
      const connectedDrivers = getConnectedDrivers()
      const entry = connectedDrivers.get(matchedDriver.driverId)
      if (entry) {
        connectedDrivers.set(matchedDriver.driverId, { ...entry, isAvailable: false })
      }

      // Notify customer that their driver has been matched
      io.emitToUser(String(req.user.id), 'notification:new', {
        id: Date.now(),
        title: '🚗 Driver Matched!',
        body: `${matchedDriver.name} is on the way. ETA: ${matchedDriver.etaMinutes} min · PIN: ${startRidePin}`,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false,
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Driver matched and ride confirmed!',
      ride: {
        id: ride._id,
        bookingId: ride.bookingId,
        vehicleType: ride.vehicleType,
        pickup: ride.pickup,
        drop: ride.drop,
        distanceKm: ride.distanceKm,
        estimatedFare: ride.estimatedFare,
        startRidePin: ride.startRidePin,
        driver: {
          id: ride.driverId,
          name: ride.driverName,
          phone: ride.driverPhone,
          vehicleNumber: ride.driverVehicleNumber,
          rating: ride.driverRating,
          etaMinutes: matchedDriver?.etaMinutes || 4,
          distanceKm: matchedDriver?.distanceKm || 1.4,
        },
        status: ride.status,
        bookedAt: ride.createdAt,
      },
    })
  } catch (err) {
    console.error('[createRide]', err)
    res.status(500).json({ success: false, message: 'Server error during ride creation.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/rides/:id/accept   — Driver Accepts Ride
   ═══════════════════════════════════════════════════════════════ */
exports.acceptRide = async (req, res) => {
  try {
    const { id } = req.params
    const ride = await Ride.findById(id)
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' })

    ride.status = 'assigned'
    ride.driverId = req.user.id
    await ride.save()

    const io = req.app.get('io')
    if (io) {
      io.to(`ride:${ride._id}`).emit('ride:status_changed', {
        rideId: ride._id,
        status: 'assigned',
        driverName: req.user.name,
      })
    }

    return res.status(200).json({ success: true, message: 'Ride accepted.', ride })
  } catch (err) {
    console.error('[acceptRide]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/rides/:id/complete   — Driver Completes Ride
   ═══════════════════════════════════════════════════════════════ */
exports.completeRide = async (req, res) => {
  try {
    const { id } = req.params
    const ride = await Ride.findById(id)
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found.' })

    ride.status = 'completed'
    await ride.save()

    // Free driver in RAM
    const connectedDrivers = getConnectedDrivers()
    const entry = connectedDrivers.get(String(req.user.id))
    if (entry) {
      connectedDrivers.set(String(req.user.id), { ...entry, isAvailable: true })
    }

    const io = req.app.get('io')
    if (io) {
      io.to(`ride:${ride._id}`).emit('ride:status_changed', {
        rideId: ride._id,
        status: 'completed',
      })
    }

    return res.status(200).json({ success: true, message: 'Ride completed successfully.', ride })
  } catch (err) {
    console.error('[completeRide]', err)
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
   GET /api/rides/available   — Open Requests for Drivers
   ═══════════════════════════════════════════════════════════════ */
exports.getAvailableRides = async (req, res) => {
  try {
    const rides = await Ride.find({ status: { $in: ['requested', 'searching'] } })
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(20)

    return res.status(200).json({ success: true, rides })
  } catch (err) {
    console.error('[getAvailableRides]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}
