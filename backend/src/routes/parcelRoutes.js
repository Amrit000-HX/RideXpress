const express = require('express')
const router  = express.Router()
const {
  createParcel,
  getParcelById,
  getMyParcels,
} = require('../controllers/parcelController')
const { protect } = require('../middleware/authMiddleware')

router.use(protect)

router.post('/',            createParcel)  // Book a parcel
router.get('/my-parcels',   getMyParcels)  // Customer's parcels
router.get('/:id',          getParcelById) // Track parcel by id or trackingId

module.exports = router
