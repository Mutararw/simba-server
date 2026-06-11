import { prisma } from '../lib/prisma.js'

export const createMeeting = async (req, res) => {
  const { title, description, participantIds } = req.body
  const creatorId = req.user.id // Assuming req.user is populated by auth middleware

  try {
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
        participants: true
      }
    })

    // Create notifications for all participants
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
