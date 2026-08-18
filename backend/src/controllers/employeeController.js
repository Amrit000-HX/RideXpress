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
