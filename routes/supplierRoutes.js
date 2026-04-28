import express from 'express'
import { getSuppliers, createSupplier } from '../controllers/supplierController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', authenticateToken, getSuppliers)
router.post('/', authenticateToken, createSupplier)

export default router
