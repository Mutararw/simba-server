import { prisma } from '../lib/prisma.js'

export const getMessages = async (req, res) => {
  try {
    const { otherUserId } = req.params
    const userId = req.user.id

    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    })

    res.json(messages)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message })
  }
}

export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body
    const senderId = req.user.id

    const message = await prisma.chatMessage.create({
      data: {
        senderId,
        receiverId,
        content
      }
    })

    res.status(201).json(message)
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message })
  }
}

export const getContacts = async (req, res) => {
  try {
    const userId = req.user.id
    const user = await prisma.user.findUnique({ where: { id: userId } })

    let contacts = []
    if (user.accountType === 'manager') {
      // Manager can chat with admins and suppliers (suppliers need user accounts for real chat, but let's assume admins for now)
      contacts = await prisma.user.findMany({
        where: { accountType: 'admin' },
        select: { id: true, name: true, accountType: true }
      })
    } else if (user.accountType === 'admin') {
      // Admin can chat with all managers
      contacts = await prisma.user.findMany({
        where: { accountType: 'manager' },
        select: { id: true, name: true, accountType: true, branchId: true }
      })
    }

    res.json(contacts)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch contacts', error: error.message })
  }
}
export const broadcastMessage = async (req, res) => {
  try {
    const { targetBranchId, content } = req.body
    const senderId = req.user.id

    if (req.user.accountType !== 'admin') {
      return res.status(403).json({ message: 'Only admins can broadcast' })
    }

    const targetUsers = await prisma.user.findMany({
      where: {
        accountType: 'manager',
        ...(targetBranchId ? { branchId: targetBranchId } : {})
      }
    })

    const messages = await Promise.all(targetUsers.map(u => 
      prisma.chatMessage.create({
        data: {
          senderId,
          receiverId: u.id,
          content
        }
      })
    ))

    res.status(201).json({ count: messages.length })
  } catch (error) {
    res.status(500).json({ message: 'Failed to broadcast message', error: error.message })
  }
}
