const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')

const authRoutes     = require('./src/routes/authRoutes')
const userRoutes     = require('./src/routes/userRoutes')
const employeeRoutes = require('./src/routes/employeeRoutes')

const app = express()

// ── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Global rate limiter (100 req / 15 min) ───────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
})
app.use('/api', globalLimiter)

// ── Stricter limiter for login (5 attempts / 15 min) ─────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
})
app.use('/api/auth/login', loginLimiter)

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',      authRoutes)
app.use('/api/users',     userRoutes)
app.use('/api/employees', employeeRoutes)

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'RideXpress API is running.' })
})

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' })
})

// ── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  })
})

module.exports = app
