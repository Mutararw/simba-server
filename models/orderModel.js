import { prisma } from '../lib/prisma.js'

export const createOrderWithItems = async ({ userId, items }) => {
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
      if (product.stock < quantity) {
        throw new Error(`Insufficient stock for product ${productId}`)
      }

      const unitPrice = Number(product.price)
      const lineTotal = unitPrice * quantity
      totalAmount += lineTotal

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
        status: 'pending'
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

      await tx.product.update({
        where: {
          id: BigInt(item.productId)
        },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      })
    }

    return {
      id: Number(order.id),
      user_id: order.userId,
      total_amount: Number(order.totalAmount),
      status: order.status,
      created_at: order.createdAt
    }
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

  return orders.map((order) => ({
    orderId: Number(order.id),
    userId: order.userId,
    totalAmount: Number(order.totalAmount),
    status: order.status,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      orderItemId: Number(item.id),
      productId: Number(item.productId),
      productName: item.product.name,
      imageUrl: item.product.imageUrl,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice)
    }))
  }))
}
