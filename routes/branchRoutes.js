import express from 'express'
import { 
  getBranches, 
  getBranchInventory, 
  getBranchUsers, 
  updateUserRole, 
  receiveInventory,
  getBranchStats,
  deleteBranchUser
} from '../controllers/branchController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', authenticateToken, getBranches)
router.get('/stats', authenticateToken, getBranchStats)
router.get('/inventory', authenticateToken, getBranchInventory)
router.get('/inventory/:branchId', authenticateToken, getBranchInventory)
router.post('/inventory/restock', authenticateToken, receiveInventory)
router.get('/users', authenticateToken, getBranchUsers)
router.get('/users/:branchId', authenticateToken, getBranchUsers)
router.delete('/users/:userId', authenticateToken, deleteBranchUser)
router.patch('/users/:userId/role', authenticateToken, updateUserRole)

export default router
