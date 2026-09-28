const mongoose = require('mongoose')

/**
 * parcels collection
 * Stores courier parcel delivery bookings with sender, receiver, route coordinates,
 * courier assignment, live tracking pins, and itemized fare.
 */
const parcelSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // ── Sender Details ─────────────────────────────────────────
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderName:  { type: String, required: true, trim: true },
    senderEmail: { type: String, default: '', trim: true },
    senderPhone: { type: String, default: '', trim: true },

    // ── Parcel Specs ───────────────────────────────────────────
    category:     { type: String, required: true, trim: true }, // e.g. 'documents', 'electronics'
    weightKg:     { type: Number, required: true, default: 1 },
    dimensions: {
      length: { type: Number, default: 0 },
      width:  { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    deliveryType: {
      type: String,
      enum: ['local', 'longDistance'],
      default: 'local',
    },
    insured:      { type: Boolean, default: false },
    instructions: { type: String, default: '', trim: true },

    // ── Pickup & Drop Locations ────────────────────────────────
    pickup: {
      address: { type: String, required: true, trim: true },
      city:    { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true },
      lat:     { type: Number, required: true },
      lng:     { type: Number, required: true },
      date:    { type: String, required: true },
      time:    { type: String, required: true },
    },

    receiver: {
      name:    { type: String, required: true, trim: true },
      phone:   { type: String, required: true, trim: true },
      address: { type: String, required: true, trim: true },
      city:    { type: String, required: true, trim: true },
      pincode: { type: String, required: true, trim: true },
      lat:     { type: Number, required: true },
      lng:     { type: Number, required: true },
    },

    distanceKm: { type: Number, default: 8.5 },

    // ── Pricing & Fare ─────────────────────────────────────────
    fare:          { type: Number, required: true },
    paymentMethod: { type: String, default: 'Pay on Pickup / UPI' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },

    // ── Security OTPs ──────────────────────────────────────────
    pickupPin:   { type: String, required: true }, // 4-digit code to release parcel to courier
    deliveryPin: { type: String, required: true }, // 4-digit code receiver gives on delivery

    // ── Courier Partner / Driver ───────────────────────────────
    courierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    courierName:          { type: String, default: 'Vikram Joshi' },
    courierPhone:         { type: String, default: '+91 98201 54321' },
    courierVehicleNumber: { type: String, default: 'MH 03 DN 1904' },
    courierVehicleType:   { type: String, default: 'Delivery Van / Two-Wheeler' },
    courierRating:        { type: Number, default: 4.92 },

    // ── Status & Timeline ──────────────────────────────────────
    status: {
      type: String,
      enum: ['scheduled', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
      default: 'assigned',
      index: true,
    },

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

module.exports = mongoose.model('Parcel', parcelSchema)
