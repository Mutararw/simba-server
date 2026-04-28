import express from 'express'
import { getMyNotifications, markAsRead } from '../controllers/notificationController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', authenticateToken, getMyNotifications)
router.patch('/:id/read', authenticateToken, markAsRead)

export default router
