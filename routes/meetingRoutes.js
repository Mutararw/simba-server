import { Router } from 'express'
import { createMeeting, getMyMeetings, endMeeting } from '../controllers/meetingController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = Router()

router.post('/', protect, createMeeting)
router.get('/my', protect, getMyMeetings)
router.post('/:meetingId/end', protect, endMeeting)

export default router
