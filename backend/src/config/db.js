const mongoose = require('mongoose')

/**
 * Connect to MongoDB using MONGO_URI from environment variables.
 * Exits the process on failure so the server doesn't start without a DB.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log(`✅  MongoDB connected: ${conn.connection.host}`)
  } catch (err) {
    console.error(`⚠️  Primary MongoDB connection failed (${err.message}).`)
    console.log(`🔄  Starting in-memory local MongoDB fallback...`)
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server')
      const mongoServer = await MongoMemoryServer.create()
      const uri = mongoServer.getUri()
      const conn = await mongoose.connect(uri)
      console.log(`✅  Local In-Memory MongoDB connected at: ${uri}`)
    } catch (fallbackErr) {
      console.error(`❌  MongoDB connection failed: ${fallbackErr.message}`)
      process.exit(1)
    }
  }
}

module.exports = connectDB
