import 'dotenv/config'
import { prisma } from './lib/prisma.js'

async function check() {
  const total = await prisma.product.count()
  const withImage = await prisma.product.count({
    where: {
      NOT: { imageUrl: null }
    }
  })
  console.log(`Total products: ${total}`)
  console.log(`With imageUrl: ${withImage}`)
  
  const sampleNull = await prisma.product.findFirst({
    where: { imageUrl: null }
  })
  console.log('Sample product with null image:', JSON.stringify(sampleNull, null, 2))
  
  await prisma.$disconnect()
}

check()
