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

    // Fetch all products
    const allProducts = await prisma.product.findMany({
      orderBy: { name: 'asc' }
    })

    // Fetch branch-specific stock
    const branchStocks = await prisma.branchStock.findMany({
      where: { branchId }
    })

    // Create a map for quick lookup
    const stockMap = new Map(branchStocks.map(s => [s.productId.toString(), s.stock]))

    const inventory = allProducts.map(p => ({
      productId: Number(p.id),
      name: p.name,
      price: Number(p.price),
      stock: stockMap.get(p.id.toString()) || 0,
      imageUrl: p.imageUrl,
      category: p.category
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

export const getBranchRecommendations = async (req, res) => {
  try {
    const productId = Number(req.params.productId)
    const excludeBranchId = req.query.excludeBranchId || req.user?.branchId || null

    if (!productId) {
      return res.status(400).json({ message: 'Product ID required' })
    }

    const branchStocks = await prisma.branchStock.findMany({
      where: {
        productId: BigInt(productId),
        stock: {
          gt: 0
        },
        ...(excludeBranchId ? { branchId: { not: excludeBranchId } } : {})
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      },
      orderBy: [
        { stock: 'desc' },
        { branchId: 'asc' }
      ]
    })

    res.json(
      branchStocks.map((stock) => ({
        branchId: stock.branchId,
        branchName: stock.branch?.name || stock.branchId,
        location: stock.branch?.location || null,
        stock: stock.stock
      }))
    )
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch branch recommendations', error: error.message })
  }
}

export const updateBranchStock = async (req, res) => {
  try {
    const branchId = req.user.branchId || req.body.branchId
    const { productId, quantity } = req.body
    if (!branchId || !productId || quantity === undefined) {
      return res.status(400).json({ message: 'Missing required fields' })
    }
    const stock = await prisma.branchStock.upsert({
      where: { branchId_productId: { branchId, productId: BigInt(productId) } },
      update: { stock: Number(quantity) },
      create: { branchId, productId: BigInt(productId), stock: Number(quantity) }
    })
    res.json(stock)
  } catch (error) {
    res.status(500).json({ message: 'Failed to update branch stock', error: error.message })
  }
}

export const deleteBranchStock = async (req, res) => {
  try {
    const branchId = req.user.branchId || req.params.branchId
    const { productId } = req.params
    if (!branchId || !productId) {
      return res.status(400).json({ message: 'Missing required fields' })
    }
    await prisma.branchStock.delete({
      where: { branchId_productId: { branchId, productId: BigInt(productId) } }
    })
    res.json({ message: 'Product removed from branch stock' })
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove product', error: error.message })
  }
}

export const getBranchStats = async (req, res) => {
  try {
    const branchId = req.user.branchId || req.params.branchId
    if (!branchId) return res.status(400).json({ message: 'Branch ID required' })

    const [revenue, ordersCount, stockCount, staffCount, customersCount] = await Promise.all([
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { branchId, status: 'completed' }
      }),
      prisma.order.count({ where: { branchId } }),
      prisma.branchStock.count({ where: { branchId } }),
      prisma.user.count({ where: { branchId } }),
      prisma.order.groupBy({
        by: ['userId'],
        where: { branchId },
        _count: { userId: true }
      }).then(res => res.length)
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
      customersCount,
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

export const getBranchCustomers = async (req, res) => {
  try {
    const branchId = req.user.branchId || req.params.branchId
    if (!branchId) return res.status(400).json({ message: 'Branch ID required' })

    // Find all unique users who have placed an order at this branch
    const orders = await prisma.order.findMany({
      where: { branchId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            image: true
          }
        }
      },
      distinct: ['userId']
    })

    const customers = orders.map(order => {
      const user = order.user;
      return {
        ...user,
        lastOrderDate: order.createdAt
      }
    })

    res.json(customers)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch branch customers', error: error.message })
  }
}

export const getBranchPayments = async (req, res) => {
  try {
    const branchId = req.user.branchId || req.params.branchId
    if (!branchId) return res.status(400).json({ message: 'Branch ID required' })

    const orders = await prisma.order.findMany({
      where: { branchId },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const payments = orders.map(order => ({
      id: Number(order.id),
      customerName: order.user.name,
      amount: Number(order.totalAmount),
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt
    }))

    res.json(payments)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch payment history', error: error.message })
  }
}
