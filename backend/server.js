/**
 * backend/server.js — Entry point
 */
require('dotenv').config()
const connectDB = require('./src/config/db')
const app       = require('./app')

const PORT = process.env.PORT || 5000

;(async () => {
  await connectDB()
  const server = app.listen(PORT, () => {
    console.log(`🚀  RideXpress API running on http://localhost:${PORT}`)
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
