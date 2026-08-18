require('dotenv').config()
const app = require('./app')
const connectDB = require('./src/config/db')

const PORT = process.env.PORT || 5000

const start = async () => {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`🚀  RideXpress backend running on http://localhost:${PORT}`)
    console.log(`📡  Environment: ${process.env.NODE_ENV || 'development'}`)
  })
}

start()
