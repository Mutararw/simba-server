import express from 'express'
import { getMessages, sendMessage, getContacts, broadcastMessage, getSuppliers } from '../controllers/chatController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/contacts', authenticateToken, getContacts)
router.get('/:otherUserId', authenticateToken, getMessages)
router.post('/', authenticateToken, sendMessage)
router.post('/broadcast', authenticateToken, broadcastMessage)
router.get('/suppliers/all', authenticateToken, getSuppliers)

export default router
