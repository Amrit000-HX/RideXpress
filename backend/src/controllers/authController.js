const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Employee = require('../models/Employee')
const { generateToken } = require('../utils/generateToken')

const SALT_ROUNDS = 10

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/register/user   — Public
   ═══════════════════════════════════════════════════════════════ */
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, city } = req.body

    // ── Input validation ──────────────────────────────────────
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      })
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      })
    }

    // ── Duplicate check ───────────────────────────────────────
    const exists = await User.findOne({ email: email.toLowerCase().trim() })
    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }

    // ── Hash password ─────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    // ── Create user ───────────────────────────────────────────
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      phone: phone?.trim() || '',
      city: city?.trim() || '',
      role: 'user',   // NEVER trust role from the client
      isActive: true,
    })

    const token = generateToken({ id: user._id, role: user.role })

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Welcome to RideXpress!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('[registerUser]', err)
    // Mongoose duplicate key
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already registered.' })
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/register/employee   — Protected (admin) in production
   In this demo, the route is open so new drivers can self-register.
   The backend sets role: 'employee' and never trusts a role from the client.
   ═══════════════════════════════════════════════════════════════ */
exports.registerEmployee = async (req, res) => {
  try {
    const { name, email, password, phone, department, designation, vehicleCategory } = req.body

    // ── Input validation ──────────────────────────────────────
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      })
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      })
    }

    // ── Duplicate email check ─────────────────────────────────
    const emailExists = await Employee.findOne({ email: email.toLowerCase().trim() })
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: 'An employee account with this email already exists.',
      })
    }

    // ── Generate unique employeeId ────────────────────────────
    const count = await Employee.countDocuments()
    const employeeId = `EMP-${String(count + 1).padStart(6, '0')}`

    // ── Hash password ─────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    // ── Create employee ───────────────────────────────────────
    const employee = await Employee.create({
      employeeId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      phone: phone?.trim() || '',
      department: department?.trim() || 'Delivery',
      designation: designation?.trim() || 'Rider',
      vehicleCategory: vehicleCategory?.trim() || '',
      role: 'employee',   // NEVER trust role from the client
      isActive: true,
    })

    const token = generateToken({ id: employee._id, role: employee.role })

    return res.status(201).json({
      success: true,
      message: 'Employee registration successful.',
      token,
      user: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        vehicleCategory: employee.vehicleCategory,
      },
    })
  } catch (err) {
    console.error('[registerEmployee]', err)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field'
      return res.status(409).json({
        success: false,
        message: `Duplicate ${field}. This ${field} is already registered.`,
      })
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/login   — Public
   Body: { email, password, accountType: 'user' | 'employee' }
   ═══════════════════════════════════════════════════════════════ */
exports.login = async (req, res) => {
  try {
    const { email, password, accountType } = req.body

    // ── Input validation ──────────────────────────────────────
    if (!email || !password || !accountType) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and account type are required.',
      })
    }
    if (!['user', 'employee'].includes(accountType)) {
      return res.status(400).json({
        success: false,
        message: 'Account type must be "user" or "employee".',
      })
    }

    // ── Find account in the correct collection ────────────────
    let account = null
    const identifier = email.trim()
    if (accountType === 'user') {
      // Must explicitly select passwordHash since it's select: false in schema
      account = await User.findOne({ email: identifier.toLowerCase() }).select('+passwordHash')
    } else {
      // Employee login accepts either email OR employeeId (e.g. EMP-000001)
      account = await Employee.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { employeeId: identifier.toUpperCase() },
          { employeeId: identifier },
        ],
      }).select('+passwordHash')

      // If not found in employees, allow admin account to access employee dashboard too
      if (!account) {
        const adminAccount = await User.findOne({ email: identifier.toLowerCase(), role: 'admin' }).select('+passwordHash')
        if (adminAccount) {
          account = adminAccount
        }
      }
    }

    // ── Account not found ─────────────────────────────────────
    // Use a generic message to avoid user enumeration
    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    // ── Inactive account ──────────────────────────────────────
    if (!account.isActive) {
      return res.status(401).json({
        success: false,
        message: 'This account has been deactivated. Please contact support.',
      })
    }

    // ── Password comparison ───────────────────────────────────
    const isMatch = await bcrypt.compare(password, account.passwordHash)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    // ── Generate JWT ──────────────────────────────────────────
    const token = generateToken({ id: account._id, role: account.role })

    // ── Build safe profile (no passwordHash) ──────────────────
    const profile = {
      id: account._id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      role: account.role,
    }
    if (account.employeeId) {
      profile.employeeId = account.employeeId
      profile.vehicleCategory = account.vehicleCategory
    }
    if (account.city) profile.city = account.city

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: profile,
    })
  } catch (err) {
    console.error('[login]', err)
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/auth/me   — Protected (any authenticated account)
   ═══════════════════════════════════════════════════════════════ */
exports.getMe = async (req, res) => {
  try {
    const { id, role } = req.user

    let account = null
    if (role === 'user' || role === 'admin') {
      account = await User.findById(id)   // passwordHash excluded by default (select: false)
    } else {
      account = await Employee.findById(id)
    }

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found.' })
    }

    return res.status(200).json({ success: true, user: account })
  } catch (err) {
    console.error('[getMe]', err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/logout   — Protected
   JWT is stateless; inform the client to discard the token.
   ═══════════════════════════════════════════════════════════════ */
exports.logout = (_req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully.' })
}
