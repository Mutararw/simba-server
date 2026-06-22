import { prisma } from '../lib/prisma.js'

export const createMeeting = async (req, res) => {
  const { title, description, participantIds } = req.body
  const creatorId = req.user.id

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ message: 'Meeting title is required' })
  }

  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    return res.status(400).json({ message: 'At least one participant is required' })
  }

  try {
    const existingUsers = await prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true }
    })

    const validIds = new Set(existingUsers.map(u => u.id))
    const invalidIds = participantIds.filter(id => !validIds.has(id))

    if (invalidIds.length > 0) {
      return res.status(400).json({
        message: 'Some participants no longer exist in the system',
        invalidIds
      })
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        creatorId,
        participants: {
          connect: participantIds.map(id => ({ id }))
        }
      },
      include: {
        creator: { select: { id: true, name: true } },
        participants: { select: { id: true, name: true, email: true } }
      }
    })

    await Promise.all(participantIds.map(userId =>
      prisma.notification.create({
        data: {
          userId,
          title: 'New Meeting Invitation',
          message: `You have been invited to a meeting: ${title}. Click to join.`
        }
      })
    ))

    return res.status(201).json(meeting)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create meeting', error: error.message })
  }
}

export const getMyMeetings = async (req, res) => {
  const userId = req.user.id
  try {
    const meetings = await prisma.meeting.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { participants: { some: { id: userId } } }
        ],
        status: 'active'
      },
      include: {
        creator: { select: { name: true } },
        participants: { select: { id: true, name: true } }
      },
      orderBy: { startTime: 'desc' }
    })
    return res.json(meetings)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch meetings', error: error.message })
  }
}

export const endMeeting = async (req, res) => {
  const { meetingId } = req.params
  try {
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: 'completed', endTime: new Date() }
    })
    return res.json({ message: 'Meeting ended successfully' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to end meeting', error: error.message })
  }
}
