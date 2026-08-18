const mongoose = require('mongoose')

/**
 * employees collection
 * passwordHash is never returned in API responses (use .select('-passwordHash'))
 */
const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned by default
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
      type: String,
      trim: true,
      default: 'Delivery',
    },
    designation: {
      type: String,
      trim: true,
      default: 'Rider',
    },
    vehicleCategory: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['employee', 'admin'],
      default: 'employee',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

// email and employeeId already have unique:true which creates indexes automatically

module.exports = mongoose.model('Employee', employeeSchema)
