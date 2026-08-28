/**
 * backend/scripts/seedAdmin.js
 *
 * Creates the first admin user in the database.
 * Run: npm run seed
 *
 * Credentials are read from .env:
 *   ADMIN_EMAIL    (default: admin@ridexpress.com)
 *   ADMIN_PASSWORD (default: Admin@12345)
 *
 * Works with both Atlas/local mongod AND in-memory MongoDB fallback.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const mongoose   = require('mongoose')
const bcrypt     = require('bcryptjs')
const connectDB  = require('../src/config/db')
const User       = require('../src/models/User')

const seed = async () => {
  try {
    await connectDB()

    const email    = (process.env.ADMIN_EMAIL    || 'admin@ridexpress.com').toLowerCase().trim()
    const name     =  process.env.ADMIN_NAME     || 'Admin'
    const password =  process.env.ADMIN_PASSWORD || 'Admin@12345'

    if (password.length < 6) {
      console.error('❌  ADMIN_PASSWORD must be at least 6 characters.')
      process.exit(1)
    }

    // Check if admin already exists
    const existing = await User.findOne({ email })
    if (existing) {
      console.log(`ℹ️   Admin already exists: ${email}  (role: ${existing.role})`)
      await mongoose.disconnect()
      process.exit(0)
    }

    // Hash and create
    const passwordHash = await bcrypt.hash(password, 10)
    const admin = await User.create({
      name,
      email,
      passwordHash,
      role: 'admin',
      isActive: true,
    })

    console.log('✅  Admin created successfully:')
    console.log(`    Name  : ${admin.name}`)
    console.log(`    Email : ${admin.email}`)
    console.log(`    Role  : ${admin.role}`)
    console.log(`    ID    : ${admin._id}`)
    console.log()
    console.log('⚠️   Change the default password after first login!')

    await mongoose.disconnect()
    process.exit(0)
  } catch (err) {
    console.error('❌  Seed error:', err.message)
    process.exit(1)
  }
}

seed()
