const mongoose = require('mongoose')

/**
 * rides collection
 * Stores every ride booking made by a customer.
 */
const rideSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vehicleType: { type: String, required: true, trim: true }, // 'Scooty', 'Sedan', etc.
    vehicleId:   { type: String, required: true, trim: true }, // 'scooty', 'sedan', etc.

    pickup: {
      address: { type: String, required: true },
      lat:     { type: Number, required: true },
      lng:     { type: Number, required: true },
    },

    drop: {
      address: { type: String, required: true },
      lat:     { type: Number, required: true },
      lng:     { type: Number, required: true },
    },

    distanceKm:    { type: Number, default: 0 },
    estimatedFare: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['requested', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'requested',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Ride', rideSchema)
