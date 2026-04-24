import 'dotenv/config'
import productsPayload from '../../client/src/assets/products.json' with { type: 'json' }
import { prisma } from '../lib/prisma.js'

const products = Array.isArray(productsPayload?.products) ? productsPayload.products : []

const mapProduct = (product) => ({
  name: product.name,
  category: product.category || 'General',
  description: product.unit ? `Unit: ${product.unit}` : null,
  price: Number(product.price || 0),
  stock: product.inStock ? 100 : 0,
  imageUrl: product.image || null
})

const chunk = (items, size) => {
  const batches = []
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size))
  }
  return batches
}

const seedProducts = async () => {
  const existingCount = await prisma.product.count()
  if (existingCount > 0) {
    console.log(`Skipped seeding because Product already has ${existingCount} record(s).`)
    return
  }

  if (products.length === 0) {
    console.log('No products found in client/src/assets/products.json.')
    return
  }

  const batches = chunk(products.map(mapProduct), 200)
  let createdCount = 0

  for (const batch of batches) {
    const result = await prisma.product.createMany({
      data: batch
    })
    createdCount += result.count
  }

  console.log(`Seeded ${createdCount} products into Product.`)
}

seedProducts()
  .catch((error) => {
    console.error('Product seeding failed:', error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
