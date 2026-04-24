import { createOrderWithItems, getOrdersByUserId } from '../models/orderModel.js'

export const createOrder = async (req, res) => {
  try {
    const { items } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required' })
    }

    const order = await createOrderWithItems({
      userId: req.user.id,
      items
    })

    return res.status(201).json(order)
  } catch (error) {
    return res.status(400).json({
      message: 'Failed to create order',
      error: error.message
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
