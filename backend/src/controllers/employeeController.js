const Employee = require('../models/Employee')

/* ═══════════════════════════════════════════════════════════════
   GET /api/employees   — Protected: admin only
   ═══════════════════════════════════════════════════════════════ */
exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({}).select('-passwordHash').sort({ createdAt: -1 })
    res.status(200).json({ success: true, count: employees.length, employees })
  } catch (err) {
    console.error('[getEmployees]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/employees/:id   — Protected: admin or the employee themselves
   ═══════════════════════════════════════════════════════════════ */
exports.getEmployeeById = async (req, res) => {
  try {
    // Allow employees to only fetch their own record
    if (req.user.role === 'employee' && req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' })
    }
    const employee = await Employee.findById(req.params.id).select('-passwordHash')
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' })
    res.status(200).json({ success: true, employee })
  } catch (err) {
    console.error('[getEmployeeById]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   PUT /api/employees/:id   — Protected: admin only
   ═══════════════════════════════════════════════════════════════ */
exports.updateEmployee = async (req, res) => {
  try {
    const { passwordHash, role, employeeId, ...updates } = req.body

    const employee = await Employee.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select('-passwordHash')

    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' })
    res.status(200).json({ success: true, employee })
  } catch (err) {
    console.error('[updateEmployee]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   DELETE /api/employees/:id   — Protected: admin only
   ═══════════════════════════════════════════════════════════════ */
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id)
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found.' })
    res.status(200).json({ success: true, message: 'Employee deleted successfully.' })
  } catch (err) {
    console.error('[deleteEmployee]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/employees/me/status   — Protected: employee only
   Persists the driver's online/offline status to the database.
   This is the canonical source of truth for availability.
   Body: { status: 'ONLINE' | 'OFFLINE' }
   ═══════════════════════════════════════════════════════════════ */
exports.updateOnlineStatus = async (req, res) => {
  try {
    const { status } = req.body
    if (!['ONLINE', 'OFFLINE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ONLINE or OFFLINE.' })
    }

    const employee = await Employee.findByIdAndUpdate(
      req.user.id,
      { onlineStatus: status },
      { new: true, runValidators: true }
    ).select('-passwordHash')

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Driver not found.' })
    }

    // Also update in-memory Socket.IO registry if available
    const io = req.app.get('io')
    if (io && io.getConnectedDrivers) {
      const drivers = io.getConnectedDrivers()
      const entry = drivers.get(String(req.user.id))
      if (entry) {
        drivers.set(String(req.user.id), {
          ...entry,
          isOnline: status === 'ONLINE',
          isAvailable: status === 'ONLINE',
        })
      }
    }

    res.status(200).json({ success: true, onlineStatus: employee.onlineStatus, employee })
  } catch (err) {
    console.error('[updateOnlineStatus]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/employees/me/status   — Protected: employee only
   Returns the driver's current persisted online status.
   ═══════════════════════════════════════════════════════════════ */
exports.getMyStatus = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select(
      'onlineStatus availabilityStatus currentRideId currentLocation location vehicleCategory vehicleNumber name'
    )
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Driver not found.' })
    }
    res.status(200).json({
      success: true,
      onlineStatus: employee.onlineStatus,
      availabilityStatus: employee.availabilityStatus,
      currentRideId: employee.currentRideId,
      currentLocation: employee.currentLocation,
      location: employee.location,
      vehicleCategory: employee.vehicleCategory,
      vehicleNumber: employee.vehicleNumber,
      name: employee.name,
    })
  } catch (err) {
    console.error('[getMyStatus]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   PATCH /api/employees/me/location   — Protected: employee only
   Persists driver GPS coordinates to MongoDB as GeoJSON Point.
   Used by frontend polling loop (REST fallback) and driverMatcher.
   Body: { lat, lng, heading?, speed? }

   GeoJSON spec: coordinates = [longitude, latitude]  ← NOT [lat, lng]
   This is what enables 2dsphere $near proximity queries.
   ═══════════════════════════════════════════════════════════════ */
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng, heading, speed } = req.body

    // ── Coordinate validation (Phase 1 — location validation requirement) ──
    const latN = Number(lat)
    const lngN = Number(lng)

    if (lat == null || lng == null) {
      return res.status(400).json({ success: false, message: 'lat and lng are required.' })
    }
    if (!isFinite(latN) || !isFinite(lngN)) {
      return res.status(400).json({ success: false, message: 'lat and lng must be finite numbers.' })
    }
    if (latN < -90 || latN > 90) {
      return res.status(400).json({ success: false, message: 'lat must be between -90 and 90.' })
    }
    if (lngN < -180 || lngN > 180) {
      return res.status(400).json({ success: false, message: 'lng must be between -180 and 180.' })
    }

    // GeoJSON: [longitude, latitude] — note order
    const employee = await Employee.findByIdAndUpdate(
      req.user.id,
      {
        location: { type: 'Point', coordinates: [lngN, latN] },
        'currentLocation.lat':       latN,
        'currentLocation.lng':       lngN,
        'currentLocation.heading':   Number(heading) || 0,
        'currentLocation.speed':     Number(speed) || 0,
        'currentLocation.updatedAt': new Date(),
      },
      { new: true }
    ).select('name onlineStatus currentLocation location')

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Driver not found.' })
    }

    res.status(200).json({
      success: true,
      location:        employee.location,
      currentLocation: employee.currentLocation,
    })
  } catch (err) {
    console.error('[updateLocation]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}
