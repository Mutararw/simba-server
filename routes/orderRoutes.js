import express from 'express'
import { createOrder, getMyOrders } from '../controllers/orderController.js'
import { authenticateToken, optionalAuthenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/', optionalAuthenticateToken, createOrder)
router.get('/me', authenticateToken, getMyOrders)

export default router
