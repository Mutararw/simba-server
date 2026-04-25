import 'dotenv/config'
import { prisma } from './lib/prisma.js'

async function check() {
  const categories = await prisma.product.groupBy({
    by: ['category'],
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    }
  })
  console.log('Categories in DB:', JSON.stringify(categories, null, 2))
  await prisma.$disconnect()
}

check()
