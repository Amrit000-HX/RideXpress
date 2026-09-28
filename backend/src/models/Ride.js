const mongoose = require('mongoose')

/**
 * rides collection
 * Stores every ride booking made by a customer with full customer, driver,
 * itemized fare breakdown, payment, and lifecycle details.
 */
const rideSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // ── Customer Details ──────────────────────────────────────
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerName:  { type: String, default: 'Customer', trim: true },
    customerEmail: { type: String, default: '', trim: true },
    customerPhone: { type: String, default: '', trim: true },

    // ── Driver Details ────────────────────────────────────────
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    driverName:          { type: String, default: '', trim: true },
    driverPhone:         { type: String, default: '', trim: true },
    driverVehicleNumber: { type: String, default: '', trim: true },
    driverRating:        { type: Number, default: 4.9 },

    // ── Vehicle & Route Details ───────────────────────────────
    vehicleType: { type: String, required: true, trim: true }, // 'Scooty', 'Sedan', etc.
    vehicleId:   { type: String, required: true, trim: true }, // 'scooty', 'sedan', etc.

    pickup: {
      address: { type: String, required: true, trim: true },
      lat:     { type: Number, required: true },
      lng:     { type: Number, required: true },
    },

    drop: {
      address: { type: String, required: true, trim: true },
      lat:     { type: Number, required: true },
      lng:     { type: Number, required: true },
    },

    distanceKm: { type: Number, default: 0 },

    // ── Pricing & Fare Breakdown ──────────────────────────────
    estimatedFare: { type: Number, default: 0 },
    actualFare:    { type: Number, default: 0 },
    fareBreakdown: {
      baseFare:     { type: Number, default: 0 },
      distanceFare: { type: Number, default: 0 },
      serviceFee:   { type: Number, default: 15 },
      taxAmount:    { type: Number, default: 0 },
      totalFare:    { type: Number, default: 0 },
    },

    paymentMethod: { type: String, default: 'Cash on Delivery / UPI' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'refunded'],
      default: 'pending',
    },

    startRidePin: { type: String, default: '1234' },

    // ── Lifecycle & Status ────────────────────────────────────
    status: {
      type: String,
      enum: ['searching', 'requested', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'searching',
      index: true,
    },

    bookedAt:    { type: Date, default: Date.now },
    acceptedAt:  { type: Date, default: null },
    startedAt:   { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },

    timeline: [
      {
        status:    { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note:      { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
)

module.exports = mongoose.model('Ride', rideSchema)
