const mongoose = require('mongoose')

/**
 * chat_messages collection
 * Stores in-app messages exchanged between customers and drivers for a specific ride.
 */
const chatMessageSchema = new mongoose.Schema(
  {
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderRole: {
      type: String,
      enum: ['customer', 'driver'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

// Index for fast chronological message loading per ride
chatMessageSchema.index({ rideId: 1, createdAt: 1 })

module.exports = mongoose.model('ChatMessage', chatMessageSchema)
