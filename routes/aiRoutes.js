import express from 'express'
import { processAiQuery, processAiAssistantQuery } from '../controllers/aiController.js'

const router = express.Router()

router.post('/chat', processAiQuery)
router.post('/assistant', processAiAssistantQuery)

export default router
