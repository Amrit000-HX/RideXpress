const express = require('express')
const router = express.Router()
const {
  registerUser,
  registerEmployee,
  login,
  loginRequest,
  verifyOtp,
  resendOtp,
  getMe,
  logout,
} = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware')

// ── Public Routes ─────────────────────────────────────────────
router.post('/register/user',     registerUser)
router.post('/register/employee', registerEmployee)
router.post('/login',             login)
router.post('/login-request',     loginRequest) // Step 1: Validate password & send OTP
router.post('/verify-otp',        verifyOtp)    // Step 2: Validate OTP & issue JWT
router.post('/resend-otp',        resendOtp)    // Resend OTP code

// ── Protected Routes ──────────────────────────────────────────
router.get( '/me',     protect, getMe)
router.post('/logout', protect, logout)

module.exports = router
