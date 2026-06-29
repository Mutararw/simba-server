import express from 'express'
import { processAiQuery } from '../controllers/aiController.js'

const router = express.Router()

router.post('/chat', processAiQuery)
router.post('/assistant', processAiQuery)

export default router
