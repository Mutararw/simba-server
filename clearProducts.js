import 'dotenv/config'
import { prisma } from './lib/prisma.js'

async function clear() {
  try {
    // Delete order items and orders first to avoid foreign key constraints
    await prisma.orderItem.deleteMany()
    await prisma.order.deleteMany()
    await prisma.product.deleteMany()
    console.log('Cleared all products, orders, and order items.')
  } catch (err) {
    console.error('Failed to clear:', err)
  } finally {
    await prisma.$disconnect()
  }
}

clear()
