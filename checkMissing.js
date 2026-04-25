import 'dotenv/config'
import { prisma } from './lib/prisma.js'

async function check() {
  const products = await prisma.product.findMany({
    where: {
      id: { in: [654, 645, 644, 643] }
    }
  })
  console.log('Specific products:', JSON.stringify(products, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2))
  await prisma.$disconnect()
}

check()
