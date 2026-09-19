const mongoose = require('mongoose')

/**
 * rides collection
 * Stores every ride booking made by a customer with full driver match details.
 */
const rideSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
      required: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    customerName:  { type: String, default: 'Customer' },
    customerPhone: { type: String, default: '' },

    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },

    driverName:          { type: String, default: '' },
    driverPhone:         { type: String, default: '' },
    driverVehicleNumber: { type: String, default: '' },
    driverRating:        { type: Number, default: 4.9 },

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
    startRidePin:  { type: String, default: '1234' },

    status: {
      type: String,
      enum: ['searching', 'requested', 'assigned', 'in_progress', 'completed', 'cancelled'],
      default: 'searching',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Ride', rideSchema)
