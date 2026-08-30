const express = require('express')
const router  = express.Router()
const { createRide, getMyRides, getAvailableRides } = require('../controllers/rideController')
const { protect }      = require('../middleware/authMiddleware')
const { requireRole }  = require('../middleware/roleMiddleware')

// All routes require a valid JWT
router.use(protect)

router.post('/',            createRide)         // Customer books a ride
router.get('/my-rides',     getMyRides)         // Customer views own rides
router.get('/available',    requireRole('employee', 'admin'), getAvailableRides) // Driver feed

module.exports = router
