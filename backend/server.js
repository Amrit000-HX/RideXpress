/**
 * backend/server.js — Entry point
 */
require('dotenv').config()
const connectDB = require('./src/config/db')
const app       = require('./app')

const PORT = process.env.PORT || 5000

;(async () => {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`🚀  RideXpress API running on http://localhost:${PORT}`)
  })
})()
