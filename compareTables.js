import 'dotenv/config'
import { prisma } from './lib/prisma.js'

async function check() {
  const countPascal = await prisma.product.count()
  const countPlural = await prisma.products.count()
  console.log(`Product (Pascal): ${countPascal}`)
  console.log(`products (Plural): ${countPlural}`)
  await prisma.$disconnect()
}

check()
