import express from 'express'
import { 
  getAllUsers, 
  updateUserRole, 
  deleteUser, 
  getSystemStats,
  getGlobalInventory,
  getPendingUsers,
  approveUser,
  getAllOrders
} from '../controllers/adminController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

// Middleware to ensure user is admin
const isAdmin = (req, res, next) => {
  if (req.user?.accountType !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
  next()
}

router.use(authenticateToken)
router.use(isAdmin)

router.get('/users', getAllUsers)
router.patch('/users/:userId/role', updateUserRole)
router.delete('/users/:userId', deleteUser)
router.get('/stats', getSystemStats)
router.get('/inventory', getGlobalInventory)
router.get('/pending-users', getPendingUsers)
router.post('/users/:userId/approve', approveUser)
router.get('/orders', getAllOrders)

export default router
