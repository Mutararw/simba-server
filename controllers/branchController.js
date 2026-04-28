import { prisma } from '../lib/prisma.js'

export const getBranches = async (req, res) => {
  try {
    const branches = await prisma.branch.findMany()
    res.json(branches)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch branches', error: error.message })
  }
}

export const getBranchInventory = async (req, res) => {
  try {
    const branchId = req.user.branchId || req.params.branchId
    if (!branchId) return res.status(400).json({ message: 'Branch ID required' })

    const stocks = await prisma.branchStock.findMany({
      where: { branchId },
      include: {
        product: true
      }
    })

    const inventory = stocks.map(s => ({
      productId: Number(s.product.id),
      name: s.product.name,
      price: Number(s.product.price),
      stock: s.stock,
      imageUrl: s.product.imageUrl
    }))

    res.json(inventory)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch inventory', error: error.message })
  }
}

export const getBranchUsers = async (req, res) => {
  try {
    const branchId = req.user.branchId || req.params.branchId
    if (!branchId) return res.status(400).json({ message: 'Branch ID required' })

    const users = await prisma.user.findMany({
      where: { branchId },
      select: {
        id: true,
        name: true,
        email: true,
        accountType: true,
        adminRole: true,
        createdAt: true
      }
    })

    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch branch users', error: error.message })
  }
}

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params
    const { accountType, adminRole } = req.body

    const user = await prisma.user.update({
      where: { id: userId },
      data: { accountType, adminRole }
    })

    res.json(user)
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user role', error: error.message })
  }
}

export const receiveInventory = async (req, res) => {
  try {
    const branchId = req.user.branchId || req.body.branchId
    const { productId, quantity } = req.body

    if (!branchId || !productId || !quantity) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const stock = await prisma.branchStock.upsert({
      where: {
        branchId_productId: {
          branchId,
          productId: BigInt(productId)
        }
      },
      update: {
        stock: { increment: Number(quantity) }
      },
      create: {
        branchId,
        productId: BigInt(productId),
        stock: Number(quantity)
      }
    })

    await prisma.stockHistory.create({
      data: {
        productId: BigInt(productId),
        branchId,
        type: "stock_in",
        quantity: Number(quantity)
      }
    })

    res.json(stock)
  } catch (error) {
    res.status(500).json({ message: 'Failed to receive inventory', error: error.message })
  }
}
export const getBranchStats = async (req, res) => {
  try {
    const branchId = req.user.branchId || req.params.branchId
    if (!branchId) return res.status(400).json({ message: 'Branch ID required' })

    const [revenue, ordersCount, stockCount, staffCount] = await Promise.all([
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { branchId, status: 'completed' }
      }),
      prisma.order.count({ where: { branchId } }),
      prisma.branchStock.count({ where: { branchId } }),
      prisma.user.count({ where: { branchId } })
    ])

    const salesOverTime = await prisma.order.findMany({
      where: { branchId, status: 'completed' },
      select: { totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 50
    })

    res.json({
      revenue: Number(revenue._sum.totalAmount || 0),
      ordersCount,
      stockCount,
      staffCount,
      salesOverTime: salesOverTime.map(s => ({
        amount: Number(s.totalAmount),
        date: s.createdAt
      }))
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch branch stats', error: error.message })
  }
}

export const deleteBranchUser = async (req, res) => {
  try {
    const { userId } = req.params
    const branchId = req.user.branchId

    const user = await prisma.user.findUnique({ where: { id: userId } })
    
    if (!user || (req.user.accountType !== 'admin' && user.branchId !== branchId)) {
      return res.status(403).json({ message: 'Permission denied' })
    }

    await prisma.user.delete({ where: { id: userId } })
    res.json({ message: 'Staff member removed successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove staff', error: error.message })
  }
}
