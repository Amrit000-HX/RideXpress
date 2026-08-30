const Ride = require('../models/Ride')

/* ═══════════════════════════════════════════════════════════════
   POST /api/rides   — Protected (any authenticated user)
   Body: { vehicleType, vehicleId, pickup, drop, distanceKm, estimatedFare }
   ═══════════════════════════════════════════════════════════════ */
exports.createRide = async (req, res) => {
  try {
    const { vehicleType, vehicleId, pickup, drop, distanceKm, estimatedFare } = req.body

    // ── Validation ────────────────────────────────────────────
    if (!vehicleType || !vehicleId) {
      return res.status(400).json({ success: false, message: 'Vehicle details are required.' })
    }
    if (!pickup?.address || pickup?.lat == null || pickup?.lng == null) {
      return res.status(400).json({ success: false, message: 'Valid pickup location is required.' })
    }
    if (!drop?.address || drop?.lat == null || drop?.lng == null) {
      return res.status(400).json({ success: false, message: 'Valid drop location is required.' })
    }

    // ── Create ride ───────────────────────────────────────────
    const ride = await Ride.create({
      customerId: req.user.id,
      vehicleType,
      vehicleId,
      pickup: {
        address: pickup.address,
        lat:     Number(pickup.lat),
        lng:     Number(pickup.lng),
      },
      drop: {
        address: drop.address,
        lat:     Number(drop.lat),
        lng:     Number(drop.lng),
      },
      distanceKm:    Number(distanceKm)    || 0,
      estimatedFare: Number(estimatedFare) || 0,
      status: 'requested',
    })

    return res.status(201).json({
      success: true,
      message: 'Ride booked successfully!',
      ride: {
        id:            ride._id,
        bookingRef:    `RX-${ride._id.toString().slice(-6).toUpperCase()}`,
        vehicleType:   ride.vehicleType,
        pickup:        ride.pickup,
        drop:          ride.drop,
        distanceKm:    ride.distanceKm,
        estimatedFare: ride.estimatedFare,
        status:        ride.status,
        bookedAt:      ride.createdAt,
      },
    })
  } catch (err) {
    console.error('[createRide]', err)
    res.status(500).json({ success: false, message: 'Server error. Please try again.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/rides/my-rides   — Protected (authenticated user's own rides)
   ═══════════════════════════════════════════════════════════════ */
exports.getMyRides = async (req, res) => {
  try {
    const rides = await Ride.find({ customerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)

    return res.status(200).json({
      success: true,
      count: rides.length,
      rides: rides.map(r => ({
        id:            r._id,
        bookingRef:    `RX-${r._id.toString().slice(-6).toUpperCase()}`,
        vehicleType:   r.vehicleType,
        pickup:        r.pickup,
        drop:          r.drop,
        distanceKm:    r.distanceKm,
        estimatedFare: r.estimatedFare,
        status:        r.status,
        bookedAt:      r.createdAt,
      })),
    })
  } catch (err) {
    console.error('[getMyRides]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/rides/available   — Protected (employees only)
   Returns all 'requested' rides for drivers to accept
   ═══════════════════════════════════════════════════════════════ */
exports.getAvailableRides = async (req, res) => {
  try {
    const rides = await Ride.find({ status: 'requested' })
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(20)

    return res.status(200).json({ success: true, rides })
  } catch (err) {
    console.error('[getAvailableRides]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}
