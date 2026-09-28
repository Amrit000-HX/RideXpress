const Parcel = require('../models/Parcel')
const User   = require('../models/User')

/**
 * City coordinates dictionary for realistic default map coordinates
 */
const CITY_COORDS = {
  mumbai:    { lat: 19.0760, lng: 72.8777 },
  delhi:     { lat: 28.6139, lng: 77.2090 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  pune:      { lat: 18.5204, lng: 73.8567 },
  chennai:   { lat: 13.0827, lng: 80.2707 },
  kolkata:   { lat: 22.5726, lng: 88.3639 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
}

function resolveCoords(cityName, isDrop = false) {
  const normalized = (cityName || '').trim().toLowerCase()
  const base = CITY_COORDS[normalized] || { lat: 19.0760, lng: 72.8777 }
  const offset = isDrop ? 0.045 : -0.015
  return {
    lat: base.lat + offset + (Math.random() - 0.5) * 0.01,
    lng: base.lng + offset + (Math.random() - 0.5) * 0.01,
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/parcels   — Create & Book Parcel Delivery
   ═══════════════════════════════════════════════════════════════ */
exports.createParcel = async (req, res) => {
  try {
    const {
      category,
      weight,
      dimL,
      dimW,
      dimH,
      deliveryType,
      insured,
      instructions,
      pickupAddr,
      pickupCity,
      pickupPin,
      pickupDate,
      pickupTime,
      pickupLat,
      pickupLng,
      recvName,
      recvPhone,
      dropAddr,
      dropCity,
      dropPin,
      dropLat,
      dropLng,
      fare,
      distanceKm,
    } = req.body

    if (!category || !pickupAddr || !recvName || !dropAddr) {
      return res.status(400).json({
        success: false,
        message: 'Category, pickup address, receiver name, and drop address are required.',
      })
    }

    const senderUser = await User.findById(req.user.id).select('name email phone')
    const senderName  = senderUser?.name || 'Sender'
    const senderEmail = senderUser?.email || ''
    const senderPhone = senderUser?.phone || '+91 98765 43210'

    // Determine geographic coordinates for the Leaflet route
    const pickupCoords = (pickupLat != null && pickupLng != null)
      ? { lat: Number(pickupLat), lng: Number(pickupLng) }
      : resolveCoords(pickupCity, false)

    const dropCoords = (dropLat != null && dropLng != null)
      ? { lat: Number(dropLat), lng: Number(dropLng) }
      : resolveCoords(dropCity, true)

    const trackingId = `RX-PRCL-${Math.floor(100000 + Math.random() * 900000)}`
    const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString()
    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString()

    const parcel = await Parcel.create({
      trackingId,
      senderId: req.user.id,
      senderName,
      senderEmail,
      senderPhone,
      category,
      weightKg: Number(weight) || 1,
      dimensions: {
        length: Number(dimL) || 0,
        width:  Number(dimW) || 0,
        height: Number(dimH) || 0,
      },
      deliveryType: deliveryType === 'longDistance' ? 'longDistance' : 'local',
      insured: Boolean(insured),
      instructions: instructions || '',
      pickup: {
        address: pickupAddr,
        city: pickupCity || 'Mumbai',
        pincode: pickupPin || '400001',
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
        date: pickupDate || new Date().toISOString().split('T')[0],
        time: pickupTime || '10:00 AM',
      },
      receiver: {
        name: recvName,
        phone: recvPhone,
        address: dropAddr,
        city: dropCity || 'Mumbai',
        pincode: dropPin || '400050',
        lat: dropCoords.lat,
        lng: dropCoords.lng,
      },
      distanceKm: Number(distanceKm) || (deliveryType === 'longDistance' ? 142 : 12.4),
      fare: Number(fare) || 120,
      pickupPin: pickupOtp,
      deliveryPin: deliveryOtp,
      courierName: 'Vikram Joshi',
      courierPhone: '+91 98201 54321',
      courierVehicleNumber: 'MH 03 DN 1904',
      courierVehicleType: 'Express Delivery Partner',
      courierRating: 4.93,
      status: 'assigned',
      timeline: [
        {
          status: 'assigned',
          timestamp: new Date(),
          note: `Courier partner assigned (Vikram Joshi). Pickup scheduled for ${pickupDate} ${pickupTime}.`,
        },
      ],
    })

    // Emit real-time notification to sender
    const io = req.app.get('io')
    if (io) {
      io.emitToUser(String(req.user.id), 'notification:new', {
        id: Date.now(),
        title: '📦 Parcel Booking Confirmed!',
        body: `Pickup scheduled. Tracking: ${parcel.trackingId} · Courier: ${parcel.courierName} · OTP: ${pickupOtp}`,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false,
      })
    }

    return res.status(201).json({
      success: true,
      message: 'Parcel delivery booked successfully!',
      parcel,
    })
  } catch (err) {
    console.error('[createParcel]', err)
    res.status(500).json({ success: false, message: 'Server error during parcel booking.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/parcels/:id   — Single Parcel Details
   ═══════════════════════════════════════════════════════════════ */
exports.getParcelById = async (req, res) => {
  try {
    const { id } = req.params
    let parcel = null

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      parcel = await Parcel.findById(id).populate('senderId', 'name email phone')
    } else {
      parcel = await Parcel.findOne({ trackingId: id }).populate('senderId', 'name email phone')
    }

    if (!parcel) {
      return res.status(404).json({ success: false, message: 'Parcel not found.' })
    }

    return res.status(200).json({ success: true, parcel })
  } catch (err) {
    console.error('[getParcelById]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/parcels/my-parcels   — Customer's Parcel Bookings
   ═══════════════════════════════════════════════════════════════ */
exports.getMyParcels = async (req, res) => {
  try {
    const parcels = await Parcel.find({ senderId: req.user.id }).sort({ createdAt: -1 }).limit(50)
    return res.status(200).json({ success: true, count: parcels.length, parcels })
  } catch (err) {
    console.error('[getMyParcels]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}
