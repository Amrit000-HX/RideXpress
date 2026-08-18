const express = require('express')
const router = express.Router()
const { getUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController')
const { protect } = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/roleMiddleware')

// All user management routes require authentication + admin role
router.use(protect, requireRole('admin'))

router.get('/',     getUsers)
router.get('/:id',  getUserById)
router.put('/:id',  updateUser)
router.delete('/:id', deleteUser)

module.exports = router
