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

    const userContacts = []
    if (user.accountType === 'manager') {
      const admins = await prisma.user.findMany({
        where: { accountType: 'admin' },
        select: { id: true, name: true, accountType: true }
      })
      userContacts.push(...admins)
    } else if (user.accountType === 'admin') {
      const managers = await prisma.user.findMany({
        where: { accountType: 'manager' },
        select: { id: true, name: true, accountType: true, branchId: true }
      })
      userContacts.push(...managers)
    } else if (user.accountType === 'supplier') {
      const admins = await prisma.user.findMany({
        where: { accountType: 'admin' },
        select: { id: true, name: true, accountType: true }
      })
      userContacts.push(...admins)
    }

    // For admins and managers, also include suppliers as contacts
    const supplierUsers = await prisma.user.findMany({
      where: { accountType: 'supplier' },
      select: { id: true, name: true, accountType: true }
    })
    userContacts.push(...supplierUsers)

    // Deduplicate by id
    const seen = new Set()
    const contacts = userContacts.filter(c => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })

    res.json(contacts)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch contacts', error: error.message })
  }
}

export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: { branch: { select: { name: true } } },
      orderBy: { name: 'asc' }
    })
    res.json(suppliers.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      branch: s.branch?.name || 'All',
      category: s.name.includes('Dairy') ? 'Dairy' : s.name.includes('Grains') ? 'Grains' : 'General'
    })))
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch suppliers', error: error.message })
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
