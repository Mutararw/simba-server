const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning up Order branchId...')
  try {
    const res = await prisma.$executeRawUnsafe('UPDATE "Order" SET "branchId" = NULL')
    console.log('Cleanup complete:', res)
  } catch (e) {
    console.log('Error during cleanup:', e.message)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
