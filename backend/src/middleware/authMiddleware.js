const { verifyToken } = require('../utils/generateToken')

/**
 * protect — JWT authentication middleware.
 *
 * Reads the Authorization: Bearer <token> header, verifies the JWT,
 * and attaches { id, role } to req.user.
 *
 * Returns 401 if the token is missing, invalid, or expired.
 */
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided. Please log in.',
      })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)

    // Attach decoded payload (id, role) to the request
    req.user = decoded
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
      })
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token. Please log in again.',
    })
  }
}

module.exports = { protect }
