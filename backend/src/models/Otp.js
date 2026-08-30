const mongoose = require('mongoose')

/**
 * otps collection
 * Stores temporary 6-digit login verification codes.
 * Automatically cleaned up by MongoDB after 10 minutes via TTL index.
 */
const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required for OTP verification'],
      lowercase: true,
      trim: true,
    },
    otp: {
      type: String,
      required: [true, 'OTP code is required'],
      trim: true,
    },
    accountType: {
      type: String,
      enum: ['user', 'employee'],
      default: 'user',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // 600 seconds = 10 minutes auto-expiration
    },
  },
  { timestamps: false }
)

module.exports = mongoose.model('Otp', otpSchema)
