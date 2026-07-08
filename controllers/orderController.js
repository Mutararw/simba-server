import { prisma } from '../lib/prisma.js'
import { createOrderWithItems, getOrdersByUserId, updateOrderStatus, getOrdersByBranchId } from '../models/orderModel.js'

export const createOrder = async (req, res) => {
  try {
    const { 
      items, branchId, orderType, pickupTime, phone, 
      paymentMethod, address, district, zone, deliveryFee, deliverySlot 
    } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required' })
    }

    const userId = req.user?.id || 'guest-user'

    const order = await createOrderWithItems({
      userId,
      items,
      branchId,
      orderType,
      pickupTime,
      phone,
      paymentMethod,
      address,
      district,
      zone,
      deliveryFee,
      deliverySlot
    })

    return res.status(201).json(order)
  } catch (error) {
    console.error('Create order failed:', error)
    const status = error.status || (error.code === 'BRANCH_STOCK_UNAVAILABLE' ? 409 : 400)

    const message = error.details
      ? `Failed to create order: ${error.message}`
      : error.message

    return res.status(status).json({
      message,
      error: error.message,
      code: error.code || null,
      details: error.details || null
    })
  }
}

export const getMyOrders = async (req, res) => {
  try {
    const orders = await getOrdersByUserId(req.user.id)
    return res.json(orders)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch orders', error: error.message })
  }
}

export const getBranchOrders = async (req, res) => {
  try {
    let branchId = req.user.branchId || req.params.branchId
    
    if (!branchId) {
      return res.status(400).json({ message: 'Branch ID required. Ensure your account is assigned to a branch.' })
    }

    // Normalize branchId for consistent matching
    branchId = branchId.trim().toLowerCase();

    const orders = await getOrdersByBranchId(branchId)
    return res.json(orders)
  } catch (error) {
    console.error('getBranchOrders error:', error);
    return res.status(500).json({ message: 'Failed to fetch branch orders', error: error.message })
  }
}

export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params
    const { status, isAccepted } = req.body
    const order = await updateOrderStatus(id, { status, isAccepted })

    if (isAccepted === true) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: 'Order Accepted',
          message: `Your pickup order #${order.id} has been accepted by the branch manager.`
        }
      })
    } else if (status) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: 'Order Update',
          message: `The status of your order #${order.id} has been changed to ${status}.`
        }
      })
    }

    return res.json(order)
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update order', error: error.message })
  }
}
