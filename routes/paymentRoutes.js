import { Router } from 'express'
import { processMomoPayment, getPaymentStatus } from '../controllers/paymentController.js'

const router = Router()

router.post('/momo', processMomoPayment)
router.get('/status/:reference', getPaymentStatus)

export default router
