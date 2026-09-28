const express = require('express')
const router  = express.Router()
const {
  createRide,
  getMyRides,
  getDriverRides,
  getAvailableRides,
  getRideById,
  acceptRide,
  completeRide,
} = require('../controllers/rideController')
const { protect }     = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/roleMiddleware')

// All routes require a valid JWT
router.use(protect)

router.post('/',              createRide)                                          // Customer books a ride
router.get('/my-rides',       getMyRides)                                          // Customer views own rides
router.get('/driver-history', requireRole('employee', 'admin'), getDriverRides)    // Driver views past rides & earnings
router.get('/available',      requireRole('employee', 'admin'), getAvailableRides) // Driver open requests feed
router.get('/:id',            getRideById)                                         // Get single ride details
router.post('/:id/accept',    requireRole('employee', 'admin'), acceptRide)        // Driver accepts ride
router.post('/:id/complete',  requireRole('employee', 'admin'), completeRide)      // Driver completes ride

module.exports = router
