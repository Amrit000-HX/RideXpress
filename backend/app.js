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

// ── Global rate limiter (relaxed for development) ─────────────
const isDev = process.env.NODE_ENV !== 'production'

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 5000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
})
app.use('/api', globalLimiter)

// ── Login rate limiter (relaxed in dev, skips on success) ──────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 5,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many failed login attempts. Please try again in a few minutes.' },
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
