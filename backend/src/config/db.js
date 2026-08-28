/**
 * backend/src/config/db.js
 *
 * Connects to MongoDB:
 *  1. Tries MONGO_URI from .env (Atlas or local mongod)
 *  2. If that fails (auth error, network error, not installed),
 *     falls back to an in-memory MongoDB server that runs locally
 *     — no installation or cloud account required.
 *
 * NOTE: The in-memory database is wiped when the server stops.
 *       Use a real MongoDB URI (Atlas or local mongod) for persistence.
 */
const mongoose = require('mongoose')

let _memoryServer = null  // keep reference so we don't GC it

const connectDB = async () => {
  const uri = process.env.MONGO_URI

  // ── Try primary URI ──────────────────────────────────────────
  if (uri && uri !== 'your_mongodb_atlas_connection_string_here') {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 6000,
      })
      console.log(`✅  MongoDB connected: ${conn.connection.host}`)
      return
    } catch (err) {
      console.warn(`⚠️  Primary MongoDB connection failed: ${err.message}`)
      console.log('🔄  Falling back to in-memory MongoDB…')
    }
  } else {
    console.log('ℹ️  No MONGO_URI set. Starting in-memory MongoDB…')
  }

  // ── Fallback: in-memory MongoDB ──────────────────────────────
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server')
    _memoryServer = await MongoMemoryServer.create()
    const memUri = _memoryServer.getUri()
    const conn = await mongoose.connect(memUri)
    console.log('✅  In-memory MongoDB started (data resets on restart).')
    console.log(`    URI: ${conn.connection.host}`)
    console.log()
    console.log('⚠️  To persist data, set a real MONGO_URI in backend/.env')
    console.log()
  } catch (fbErr) {
    console.error('❌  Could not start any MongoDB connection:', fbErr.message)
    process.exit(1)
  }
}

module.exports = connectDB
