/**
 * scripts/seedAdmin.js
 *
 * Creates the first admin user in the database.
 * Run once: npm run seed
 *
 * Admin credentials are read from .env (ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD).
 * NEVER commit real credentials.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')
const User     = require('../src/models/User')

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅  Connected to MongoDB')

    const email    = (process.env.ADMIN_EMAIL    || 'admin@ridexpress.com').toLowerCase()
    const name     = process.env.ADMIN_NAME      || 'Admin'
    const password = process.env.ADMIN_PASSWORD  || 'Admin@12345'

    const exists = await User.findOne({ email })
    if (exists) {
      console.log(`ℹ️   Admin already exists: ${email}`)
      await mongoose.disconnect()
      return
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const admin = await User.create({
      name,
      email,
      passwordHash,
      role: 'admin',
      isActive: true,
    })

    console.log('✅  Admin created successfully:')
    console.log(`    Name:  ${admin.name}`)
    console.log(`    Email: ${admin.email}`)
    console.log(`    Role:  ${admin.role}`)
    console.log(`    ID:    ${admin._id}`)
    console.log('\n⚠️   Change the admin password after first login!')

    await mongoose.disconnect()
  } catch (err) {
    console.error('❌  Seed error:', err.message)
    process.exit(1)
  }
}

seed()
