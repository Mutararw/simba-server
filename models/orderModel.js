import { prisma } from '../lib/prisma.js'

const toOrderDto = (order) => ({
  id: Number(order.id),
  orderId: Number(order.id),
  userId: order.userId,
  totalAmount: Number(order.totalAmount),
  status: order.status,
  orderType: order.orderType,
  isAccepted: order.isAccepted,
  branchId: order.branchId,
  pickupTime: order.pickupTime,
  phone: order.phone,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus || "pending",
  paymentReference: order.paymentReference,
  createdAt: order.createdAt
})

export const createOrderWithItems = async ({ userId, items, branchId, orderType, pickupTime, phone, paymentMethod }) => {
  // Ensure user exists (for guest checkout)
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: 'Guest User',
      email: `guest_${userId}@simba.com`,
    }
  })

  return prisma.$transaction(async (tx) => {
    let totalAmount = 0
    const normalizedItems = []

    for (const item of items) {
      const productId = Number(item.productId)
      const quantity = Number(item.quantity)

      if (!productId || !quantity || quantity < 1) {
        throw new Error('Invalid order items')
      }

      const product = await tx.product.findUnique({
        where: {
          id: BigInt(productId)
        },
        select: {
          id: true,
          price: true,
          stock: true
        }
      })

      if (!product) {
        throw new Error(`Product ${productId} not found`)
      }
      const unitPrice = Number(product.price)
      const lineTotal = unitPrice * quantity
      totalAmount += lineTotal

      if (branchId) {
        const branchStock = await tx.branchStock.findUnique({
          where: {
            branchId_productId: {
              branchId,
              productId: BigInt(productId)
            }
          }
        })

        if (!branchStock || branchStock.stock < quantity) {
          throw new Error(`Insufficient stock for product ${productId} in this branch`)
        }
      } else if (product.stock < quantity) {
        throw new Error(`Insufficient stock for product ${productId}`)
      }

      normalizedItems.push({
        productId,
        quantity,
        unitPrice
      })
    }

    const order = await tx.order.create({
      data: {
        userId,
        totalAmount,
        status: 'pending',
        orderType: orderType || 'shopping',
        isAccepted: false,
        branchId,
        pickupTime,
        phone,
        paymentMethod: paymentMethod || "momo"
      }
    })

    for (const item of normalizedItems) {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: BigInt(item.productId),
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }
      })

      if (branchId) {
        await tx.branchStock.update({
          where: {
            branchId_productId: {
              branchId,
              productId: BigInt(item.productId)
            }
          },
          data: {
            stock: { decrement: item.quantity }
          }
        })
        
        await tx.stockHistory.create({
          data: {
            productId: BigInt(item.productId),
            branchId,
            type: "sale",
            quantity: item.quantity
          }
        })
      } else {
        await tx.product.update({
          where: { id: BigInt(item.productId) },
          data: { stock: { decrement: item.quantity } }
        })

        await tx.stockHistory.create({
          data: {
            productId: BigInt(item.productId),
            type: "sale",
            quantity: item.quantity
          }
        })
      }
    }

    return toOrderDto(order)
  })
}

export const getOrdersByUserId = async (userId) => {
  const orders = await prisma.order.findMany({
    where: {
      userId
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              imageUrl: true
            }
          }
        },
        orderBy: {
          id: 'asc'
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return orders.map((order) => {
    const dto = toOrderDto(order)
    return {
      ...dto,
      items: order.items.map((item) => ({
        orderItemId: Number(item.id),
        productId: Number(item.productId),
        productName: item.product.name,
        imageUrl: item.product.imageUrl,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice)
      }))
    }
  })
}
export const getOrdersByBranchId = async (branchId) => {
  const orders = await prisma.order.findMany({
    where: { branchId },
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

  return orders.map(order => ({
    ...toOrderDto(order),
    customerName: order.user.name,
    items: order.items.map(item => ({
      productId: Number(item.productId),
      productName: item.product.name,
      imageUrl: item.product.imageUrl,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice)
    }))
  }))
}

export const updateOrderStatus = async (orderId, { status, isAccepted }) => {
  const data = {}
  if (status) data.status = status
  if (isAccepted !== undefined) {
    data.isAccepted = isAccepted
    // If accepted, set payment to paid and move to completed/ready if it was pending
    if (isAccepted) {
      data.paymentStatus = "paid"
      data.status = "completed" // Automatically move to completed so it's "given to customer"
    }
  }

  const order = await prisma.order.update({
    where: { id: BigInt(orderId) },
    data,
    include: { user: { select: { id: true, name: true } } }
  })

  return toOrderDto(order)
}
