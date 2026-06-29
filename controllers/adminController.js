import { prisma } from '../lib/prisma.js'

export const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        branch: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return res.json(users)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users', error: error.message })
  }
}

export const updateUserRole = async (req, res) => {
  const { userId } = req.params
  const { accountType, adminRole, branchId } = req.body

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        accountType,
        adminRole: accountType === 'admin' ? (adminRole || 'manager') : null,
        branchId: accountType === 'manager' ? branchId : (accountType === 'admin' ? branchId : null)
      }
    })
    return res.json(user)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update user role', error: error.message })
  }
}

export const deleteUser = async (req, res) => {
  const { userId } = req.params

  try {
    await prisma.user.delete({
      where: { id: userId }
    })
    return res.json({ message: 'User deleted successfully' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete user', error: error.message })
  }
}

export const getSystemStats = async (req, res) => {
  try {
    const [totalRevenue, totalOrders, totalUsers, activeBranches] = await Promise.all([
      prisma.order.aggregate({
        _sum: {
          totalAmount: true
        },
        where: {
          status: 'completed'
        }
      }),
      prisma.order.count(),
      prisma.user.count(),
      prisma.branch.count()
    ])

    const branchStats = await prisma.branch.findMany({
      include: {
        _count: {
          select: { orders: true, users: true }
        },
        orders: {
          where: { status: 'completed' },
          select: { totalAmount: true }
        }
      }
    })

    const formattedBranchStats = branchStats.map(branch => ({
      id: branch.id,
      name: branch.name,
      orderCount: branch._count.orders,
      revenue: branch.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0),
      userCount: branch._count.users
    }))

    // Get Top Products by Revenue
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: { status: 'completed' }
      },
      include: {
        product: true
      }
    })

    const productSales = {}
    const categorySales = {}

    orderItems.forEach(item => {
      const revenue = Number(item.price) * item.quantity
      
      // Product mapping
      if (!productSales[item.productId]) {
        productSales[item.productId] = { 
          name: item.product.name, 
          revenue: 0, 
          salesCount: 0,
          category: item.product.category
        }
      }
      productSales[item.productId].revenue += revenue
      productSales[item.productId].salesCount += item.quantity

      // Category mapping
      const cat = item.product.category || 'General'
      if (!categorySales[cat]) {
        categorySales[cat] = 0
      }
      categorySales[cat] += revenue
    })

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    const salesByCategory = Object.entries(categorySales).map(([name, value]) => ({
      name,
      value
    }))

    // Recent Global Transactions
    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        branch: { select: { name: true } }
      }
    })

    const formattedRecentOrders = recentOrders.map(o => ({
      id: Number(o.id),
      customer: o.user.name,
      branch: o.branch?.name || 'N/A',
      amount: Number(o.totalAmount),
      status: o.status,
      date: o.createdAt
    }))

    return res.json({
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      totalOrders,
      totalUsers,
      activeBranches,
      branchStats: formattedBranchStats,
      topProducts,
      salesByCategory,
      recentTransactions: formattedRecentOrders
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch system stats', error: error.message })
  }
}
export const getGlobalInventory = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        branchStocks: {
          include: { branch: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    const formatted = []
    products.forEach(p => {
      if (p.branchStocks.length === 0) {
        formatted.push({
          productId: Number(p.id),
          name: p.name,
          category: p.category,
          price: Number(p.price),
          stock: 0,
          branchName: 'Catalog (No Stock)',
          branchId: null,
          imageUrl: p.imageUrl
        })
      } else {
        p.branchStocks.forEach(s => {
          formatted.push({
            productId: Number(p.id),
            name: p.name,
            category: p.category,
            price: Number(p.price),
            stock: s.stock,
            branchName: s.branch?.name || 'Unknown',
            branchId: s.branchId,
            imageUrl: p.imageUrl
          })
        })
      }
    })

    res.json(formatted)
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch global inventory', error: error.message })
  }
}
export const getPendingUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { isApproved: false },
      include: { branch: true },
      orderBy: { createdAt: 'desc' }
    })
    return res.json(users)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch pending users', error: error.message })
  }
}

export const approveUser = async (req, res) => {
  const { userId } = req.params
  const { approve } = req.body // true to approve, false to delete/deny

  try {
    if (approve) {
      await prisma.user.update({
        where: { id: userId },
        data: { isApproved: true }
      })
      
      // Notify the user (optional, can add Notification model entry)
      await prisma.notification.create({
        data: {
          userId,
          title: 'Account Approved',
          message: 'Your administrative account has been approved. You can now access your dashboard.'
        }
      })

      return res.json({ message: 'User approved successfully' })
    } else {
      await prisma.user.delete({
        where: { id: userId }
      })
      return res.json({ message: 'User request denied and removed' })
    }
  } catch (error) {
    return res.status(500).json({ message: 'Action failed', error: error.message })
  }
}

export const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: { select: { name: true, imageUrl: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return res.json(orders.map(order => ({
      id: Number(order.id),
      orderId: Number(order.id),
      userId: order.userId,
      customerName: order.user.name,
      totalAmount: Number(order.totalAmount),
      status: order.status,
      orderType: order.orderType,
      isAccepted: order.isAccepted,
      branchId: order.branchId,
      pickupTime: order.pickupTime,
      phone: order.phone,
      address: order.address,
      district: order.district,
      zone: order.zone,
      deliveryFee: Number(order.deliveryFee || 0),
      deliverySlot: order.deliverySlot,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus || "pending",
      paymentReference: order.paymentReference,
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        orderItemId: Number(item.id),
        productId: Number(item.productId),
        productName: item.product.name,
        imageUrl: item.product.imageUrl,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice)
      }))
    })))
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch all orders', error: error.message })
  }
}
