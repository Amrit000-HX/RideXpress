/**
 * backend/server.js — Entry point with Express HTTP & Socket.IO WebSockets
 */
require('dotenv').config()
const http = require('http')
const { Server } = require('socket.io')
const connectDB = require('./src/config/db')
const autoSeed  = require('./src/utils/autoSeed')
const app       = require('./app')
const mountSocketManager = require('./src/socket/socketManager')

const PORT = process.env.PORT || 5000

;(async () => {
  await connectDB()
  await autoSeed()

  // ── Create HTTP Server & Mount Socket.IO ─────────────────────────────
  const httpServer = http.createServer(app)

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  })

  // Expose io instance to Express controllers via req.app.get('io')
  app.set('io', io)

  // Mount central Socket.IO connection & event handlers
  mountSocketManager(io)

  const server = httpServer.listen(PORT, () => {
    console.log(`🚀  RideXpress API & WebSocket running on http://localhost:${PORT}`)
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌  Port ${PORT} is already in use by another process.`)
      console.error(`👉  To free port ${PORT} on Windows PowerShell, run:`)
      console.error(`    Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process -Force\n`)
      process.exit(1)
    }
    console.error('Server error:', err)
  })
})()
