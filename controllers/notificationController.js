import { prisma } from '../lib/prisma.js'

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    })
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message })
  }
}

export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params
    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    })
    res.json({ message: 'Marked as read' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notification', error: error.message })
  }
}
