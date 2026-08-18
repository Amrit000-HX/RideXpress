const User = require('../models/User')

/* ═══════════════════════════════════════════════════════════════
   GET /api/users   — Protected: admin only
   ═══════════════════════════════════════════════════════════════ */
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-passwordHash').sort({ createdAt: -1 })
    res.status(200).json({ success: true, count: users.length, users })
  } catch (err) {
    console.error('[getUsers]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/users/:id   — Protected: admin only
   ═══════════════════════════════════════════════════════════════ */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash')
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' })
    res.status(200).json({ success: true, user })
  } catch (err) {
    console.error('[getUserById]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   PUT /api/users/:id   — Protected: admin only
   ═══════════════════════════════════════════════════════════════ */
exports.updateUser = async (req, res) => {
  try {
    // Prevent role/passwordHash change through this endpoint
    const { passwordHash, role, ...updates } = req.body

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select('-passwordHash')

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' })
    res.status(200).json({ success: true, user })
  } catch (err) {
    console.error('[updateUser]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   DELETE /api/users/:id   — Protected: admin only
   ═══════════════════════════════════════════════════════════════ */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' })
    res.status(200).json({ success: true, message: 'User deleted successfully.' })
  } catch (err) {
    console.error('[deleteUser]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}
