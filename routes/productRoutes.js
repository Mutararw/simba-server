import express from 'express'
import {
  listProducts,
  getSingleProduct,
  createSingleProduct,
  updateSingleProduct,
  deleteSingleProduct
} from '../controllers/productController.js'
import { authenticateToken, authorizeProductAdmins } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', listProducts)
router.get('/:id', getSingleProduct)
router.post('/', authenticateToken, authorizeProductAdmins, createSingleProduct)
router.put('/:id', authenticateToken, authorizeProductAdmins, updateSingleProduct)
router.delete('/:id', authenticateToken, authorizeProductAdmins, deleteSingleProduct)

export default router
