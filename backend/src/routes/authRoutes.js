const express = require('express')
const router = express.Router()
const {
  registerUser,
  registerEmployee,
  login,
  getMe,
  logout,
} = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware')

// ── Public ────────────────────────────────────────────────────
router.post('/register/user',     registerUser)
router.post('/register/employee', registerEmployee)
router.post('/login',             login)

// ── Protected ─────────────────────────────────────────────────
router.get( '/me',     protect, getMe)
router.post('/logout', protect, logout)

module.exports = router
