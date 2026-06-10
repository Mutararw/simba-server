import express from 'express'
import { 
  getBranches, 
  getBranchInventory, 
  getBranchUsers, 
  updateUserRole, 
  receiveInventory,
  getBranchRecommendations,
  getBranchStats,
  deleteBranchUser,
  getBranchCustomers,
  getBranchPayments
} from '../controllers/branchController.js'
import { authenticateToken, optionalAuthenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', authenticateToken, getBranches)
router.get('/stats', authenticateToken, getBranchStats)
router.get('/inventory', authenticateToken, getBranchInventory)
router.get('/inventory/:branchId', authenticateToken, getBranchInventory)
router.get('/recommendations/:productId', optionalAuthenticateToken, getBranchRecommendations)
router.post('/inventory/restock', authenticateToken, receiveInventory)
router.get('/users', authenticateToken, getBranchUsers)
router.get('/users/:branchId', authenticateToken, getBranchUsers)
router.get('/customers', authenticateToken, getBranchCustomers)
router.get('/customers/:branchId', authenticateToken, getBranchCustomers)
router.get('/payments', authenticateToken, getBranchPayments)
router.get('/payments/:branchId', authenticateToken, getBranchPayments)
router.delete('/users/:userId', authenticateToken, deleteBranchUser)
router.patch('/users/:userId/role', authenticateToken, updateUserRole)

export default router
