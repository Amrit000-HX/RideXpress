const ChatMessage = require('../models/ChatMessage')
const Ride = require('../models/Ride')

/**
 * GET /api/chat/:rideId
 * Fetch full chat history for a given ride session.
 */
exports.getMessages = async (req, res) => {
  try {
    const { rideId } = req.params

    const messages = await ChatMessage.find({ rideId }).sort({ createdAt: 1 }).limit(100)

    return res.status(200).json({
      success: true,
      count: messages.length,
      messages: messages.map((m) => ({
        id: m._id,
        rideId: m.rideId,
        senderId: m.senderId,
        senderName: m.senderName,
        senderRole: m.senderRole,
        message: m.message,
        readAt: m.readAt,
        createdAt: m.createdAt,
      })),
    })
  } catch (err) {
    console.error('[getMessages]', err)
    res.status(500).json({ success: false, message: 'Server error loading messages.' })
  }
}

/**
 * POST /api/chat/:rideId
 * Post a new message via REST (fallback if socket is temporarily reconnecting).
 */
exports.sendMessage = async (req, res) => {
  try {
    const { rideId } = req.params
    const { message, senderRole, senderName } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required.' })
    }

    const newMessage = await ChatMessage.create({
      rideId,
      senderId: req.user.id,
      senderName: senderName || req.user.name || 'User',
      senderRole: senderRole || (req.user.role === 'employee' ? 'driver' : 'customer'),
      message: message.trim(),
    })

    const io = req.app.get('io')
    if (io) {
      // Broadcast to ride room
      io.to(`ride:${rideId}`).emit('chat:message', {
        id: newMessage._id,
        rideId: newMessage.rideId,
        senderId: newMessage.senderId,
        senderName: newMessage.senderName,
        senderRole: newMessage.senderRole,
        message: newMessage.message,
        createdAt: newMessage.createdAt,
      })
    }

    return res.status(201).json({ success: true, message: newMessage })
  } catch (err) {
    console.error('[sendMessage]', err)
    res.status(500).json({ success: false, message: 'Server error sending message.' })
  }
}
