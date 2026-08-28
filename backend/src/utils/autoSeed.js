const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Employee = require('../models/Employee')

/**
 * Automatically seeds default Admin, Customer, and Employee demo accounts
 * on server start if they do not already exist.
 */
const autoSeed = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@ridexpress.com').toLowerCase().trim()
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345'

    // 1. Seed Admin
    const adminExists = await User.findOne({ email: adminEmail })
    if (!adminExists) {
      const passwordHash = await bcrypt.hash(adminPassword, 10)
      await User.create({
        name: 'Admin',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        isActive: true,
      })
      console.log(`👤  Seeded Admin: ${adminEmail} / ${adminPassword}`)
    }

    // 2. Seed Demo Customer
    const userEmail = 'user@ridexpress.com'
    const userExists = await User.findOne({ email: userEmail })
    if (!userExists) {
      const passwordHash = await bcrypt.hash('User@12345', 10)
      await User.create({
        name: 'Demo Customer',
        email: userEmail,
        passwordHash,
        role: 'user',
        city: 'Mumbai',
        isActive: true,
      })
      console.log(`👤  Seeded Customer: ${userEmail} / User@12345`)
    }

    // 3. Seed Demo Employee
    const empEmail = 'driver@ridexpress.com'
    const empExists = await Employee.findOne({ email: empEmail })
    if (!empExists) {
      const passwordHash = await bcrypt.hash('Driver@12345', 10)
      await Employee.create({
        employeeId: 'EMP-000001',
        name: 'Demo Driver',
        email: empEmail,
        passwordHash,
        phone: '9876543210',
        department: 'Delivery',
        designation: 'Rider',
        vehicleCategory: 'Scooty',
        role: 'employee',
        isActive: true,
      })
      console.log(`👤  Seeded Employee: ${empEmail} (ID: EMP-000001) / Driver@12345`)
    }
  } catch (err) {
    console.error('⚠️  Auto-seed error:', err.message)
  }
}

module.exports = autoSeed
