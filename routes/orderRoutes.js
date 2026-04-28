import express from 'express'
import { createOrder, getMyOrders, getBranchOrders, updateOrder } from '../controllers/orderController.js'
import { authenticateToken, optionalAuthenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/', optionalAuthenticateToken, createOrder)
router.get('/me', authenticateToken, getMyOrders)
router.get('/branch', authenticateToken, getBranchOrders)
router.get('/branch/:branchId', authenticateToken, getBranchOrders)
router.patch('/:id', authenticateToken, updateOrder)

export default router
