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

    distanceKm:       { type: Number, default: 0 },
    estimatedMinutes: { type: Number, default: 0 },

    // Optional user notes / instructions
    notes: { type: String, default: '', trim: true },

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
      enum: [
        'searching',       // Looking for a driver
        'requested',       // Sent to a specific driver, awaiting response
        'assigned',        // Driver accepted
        'rider_arriving',  // Driver en-route to pickup
        'rider_arrived',   // Driver at pickup location
        'in_progress',     // Ride started (formerly just accepted)
        'completed',       // Trip done
        'cancelled',       // Cancelled by user or driver
        'rejected',        // All drivers rejected / no driver found
        'expired',         // Timeout - no driver responded
      ],
      default: 'searching',
      index: true,
    },

    // ── Reassignment tracking ─────────────────────────────────
    // Driver IDs that rejected this ride (excluded from future matching attempts)
    rejectedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],

    // Who cancelled and why
    cancelledBy:        { type: String, enum: ['user', 'rider', 'driver', 'system', null], default: null },
    cancellationReason: { type: String, default: '', trim: true },

    // ── Timestamps for each lifecycle stage ──────────────────
    bookedAt:    { type: Date, default: Date.now },
    acceptedAt:  { type: Date, default: null },
    arrivedAt:   { type: Date, default: null },
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

// Compound indexes for efficient availability and history queries
rideSchema.index({ status: 1, createdAt: -1 })
rideSchema.index({ customerId: 1, status: 1 })
rideSchema.index({ driverId: 1, status: 1 })

module.exports = mongoose.model('Ride', rideSchema)
