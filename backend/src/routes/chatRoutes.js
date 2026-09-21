const express = require('express')
const router  = express.Router()
const { getMessages, sendMessage } = require('../controllers/chatController')
const { protect } = require('../middleware/authMiddleware')

router.use(protect)

router.get('/:rideId',  getMessages)   // Fetch history
router.post('/:rideId', sendMessage)   // REST fallback post

module.exports = router
