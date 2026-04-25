import 'dotenv/config'
import { prisma } from './lib/prisma.js'

async function check() {
  const count = await prisma.product.count()
  const firstFew = await prisma.product.findMany({ take: 5 })
  console.log(`Total products: ${count}`)
  console.log('Sample products:', JSON.stringify(firstFew, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2))
  await prisma.$disconnect()
}

check()
