const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Employee = require('../models/Employee')
const Otp = require('../models/Otp')
const { generateToken } = require('../utils/generateToken')
const { sendOtpEmail } = require('../utils/emailService')

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
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      })
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/register/employee   — Public / Admin
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

    // ── Duplicate check ───────────────────────────────────────
    const exists = await Employee.findOne({ email: email.toLowerCase().trim() })
    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'An employee account with this email already exists.',
      })
    }

    // ── Auto-generate sequential employee ID (EMP-000001) ─────
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
      role: 'employee',
      isActive: true,
    })

    const token = generateToken({ id: employee._id, role: employee.role })

    return res.status(201).json({
      success: true,
      message: 'Employee registered successfully.',
      token,
      user: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        department: employee.department,
        designation: employee.designation,
        vehicleCategory: employee.vehicleCategory,
        role: employee.role,
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
   POST /api/auth/login-request   — Public (Step 1 of 2-Step Auth)
   Verifies email & password, generates 6-digit OTP, sends to Email
   ═══════════════════════════════════════════════════════════════ */
exports.loginRequest = async (req, res) => {
  try {
    const { email, password, accountType = 'user' } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Employee ID and password are required.',
      })
    }

    const identifier = email.trim()
    let account = null

    if (accountType === 'user') {
      account = await User.findOne({ email: identifier.toLowerCase() }).select('+passwordHash')
    } else {
      account = await Employee.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { employeeId: identifier.toUpperCase() },
          { employeeId: identifier },
        ],
      }).select('+passwordHash')

      if (!account) {
        const adminAccount = await User.findOne({ email: identifier.toLowerCase(), role: 'admin' }).select('+passwordHash')
        if (adminAccount) account = adminAccount
      }
    }

    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    if (!account.isActive) {
      return res.status(401).json({
        success: false,
        message: 'This account has been deactivated. Please contact support.',
      })
    }

    const isMatch = await bcrypt.compare(password, account.passwordHash)
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      })
    }

    // ── Generate 6-digit random verification OTP ──────────────
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

    // ── Store in Otp collection (replacing old OTP for this email)
    await Otp.deleteMany({ email: account.email.toLowerCase() })
    await Otp.create({
      email: account.email.toLowerCase(),
      otp: otpCode,
      accountType: account.role === 'employee' ? 'employee' : 'user',
    })

    // ── Dispatch email ────────────────────────────────────────
    await sendOtpEmail({
      to: account.email,
      otp: otpCode,
      name: account.name,
    })

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${account.email}.`,
      email: account.email,
      accountType: account.role === 'employee' ? 'employee' : 'user',
      devOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    })
  } catch (err) {
    console.error('[loginRequest]', err)
    res.status(500).json({ success: false, message: 'Server error during login request.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/verify-otp   — Public (Step 2 of 2-Step Auth)
   Validates 6-digit OTP from email, deletes OTP, issues JWT token
   ═══════════════════════════════════════════════════════════════ */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp, accountType = 'user' } = req.body

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit OTP code are required.',
      })
    }

    const cleanEmail = email.toLowerCase().trim()
    const cleanOtp = otp.trim()

    // ── Check OTP record in database ──────────────────────────
    const otpRecord = await Otp.findOne({ email: cleanEmail, otp: cleanOtp })

    // Also support fallback demo code '123456' for offline dev testing if needed
    const isValidDemoCode = process.env.NODE_ENV !== 'production' && cleanOtp === '123456'

    if (!otpRecord && !isValidDemoCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code. Please request a new one.',
      })
    }

    // Delete used OTP
    await Otp.deleteMany({ email: cleanEmail })

    // ── Retrieve user / employee account ──────────────────────
    let account = null
    if (accountType === 'user') {
      account = await User.findOne({ email: cleanEmail })
    } else {
      account = await Employee.findOne({ email: cleanEmail })
      if (!account) {
        account = await User.findOne({ email: cleanEmail, role: 'admin' })
      }
    }

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found.' })
    }

    // ── Generate JWT token ────────────────────────────────────
    const token = generateToken({ id: account._id, role: account.role })

    // ── Safe profile ──────────────────────────────────────────
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
      message: 'Authentication successful. Welcome!',
      token,
      user: profile,
    })
  } catch (err) {
    console.error('[verifyOtp]', err)
    res.status(500).json({ success: false, message: 'Server error during OTP verification.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/resend-otp   — Public
   Generates a new 6-digit OTP and re-sends to email
   ═══════════════════════════════════════════════════════════════ */
exports.resendOtp = async (req, res) => {
  try {
    const { email, accountType = 'user' } = req.body

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' })
    }

    const cleanEmail = email.toLowerCase().trim()
    let account = null

    if (accountType === 'user') {
      account = await User.findOne({ email: cleanEmail })
    } else {
      account = await Employee.findOne({
        $or: [{ email: cleanEmail }, { employeeId: cleanEmail.toUpperCase() }],
      })
      if (!account) {
        account = await User.findOne({ email: cleanEmail, role: 'admin' })
      }
    }

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found.' })
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

    await Otp.deleteMany({ email: account.email.toLowerCase() })
    await Otp.create({
      email: account.email.toLowerCase(),
      otp: otpCode,
      accountType: account.role === 'employee' ? 'employee' : 'user',
    })

    await sendOtpEmail({
      to: account.email,
      otp: otpCode,
      name: account.name,
    })

    return res.status(200).json({
      success: true,
      message: `A new verification code has been sent to ${account.email}.`,
      devOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
    })
  } catch (err) {
    console.error('[resendOtp]', err)
    res.status(500).json({ success: false, message: 'Server error during OTP resend.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST /api/auth/login   — Direct login (backward compatible)
   ═══════════════════════════════════════════════════════════════ */
exports.login = async (req, res) => {
  try {
    const { email, password, accountType } = req.body

    if (!email || !password || !accountType) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and account type are required.',
      })
    }

    let account = null
    const identifier = email.trim()
    if (accountType === 'user') {
      account = await User.findOne({ email: identifier.toLowerCase() }).select('+passwordHash')
    } else {
      account = await Employee.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { employeeId: identifier.toUpperCase() },
          { employeeId: identifier },
        ],
      }).select('+passwordHash')

      if (!account) {
        const adminAccount = await User.findOne({ email: identifier.toLowerCase(), role: 'admin' }).select('+passwordHash')
        if (adminAccount) account = adminAccount
      }
    }

    if (!account) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' })
    }

    if (!account.isActive) {
      return res.status(401).json({ success: false, message: 'This account has been deactivated.' })
    }

    const isMatch = await bcrypt.compare(password, account.passwordHash)
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' })
    }

    const token = generateToken({ id: account._id, role: account.role })

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
    res.status(500).json({ success: false, message: 'Server error.' })
  }
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/auth/me   — Protected
   ═══════════════════════════════════════════════════════════════ */
exports.getMe = async (req, res) => {
  try {
    const { id, role } = req.user
    let account = null
    if (role === 'user' || role === 'admin') {
      account = await User.findById(id)
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
   ═══════════════════════════════════════════════════════════════ */
exports.logout = (_req, res) => {
  return res.status(200).json({ success: true, message: 'Logged out successfully.' })
}
