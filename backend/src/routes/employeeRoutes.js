const express = require('express')
const router = express.Router()
const {
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController')
const { protect } = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/roleMiddleware')

// List all & delete — admin only
router.get('/',     protect, requireRole('admin'), getEmployees)
router.delete('/:id', protect, requireRole('admin'), deleteEmployee)
router.put('/:id',  protect, requireRole('admin'), updateEmployee)

// Get by ID — admin or the employee themselves (logic inside controller)
router.get('/:id',  protect, requireRole('admin', 'employee'), getEmployeeById)

module.exports = router
