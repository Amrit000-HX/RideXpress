/**
 * requireRole — Role-based authorization middleware factory.
 *
 * Usage:
 *   router.get('/admin-only', protect, requireRole('admin'), handler)
 *   router.get('/emp-or-admin', protect, requireRole('employee', 'admin'), handler)
 *
 * Must be used AFTER the `protect` middleware (req.user must be populated).
 * Returns 403 if the authenticated user's role is not in the allowed list.
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated.',
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      })
    }

    next()
  }
}

module.exports = { requireRole }
