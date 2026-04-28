import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning up Order branchId...')
  // Using queryRaw because the model might not match the DB yet
  try {
    await prisma.$executeRawUnsafe('UPDATE "Order" SET "branchId" = NULL')
    console.log('Cleanup complete.')
  } catch (e) {
    console.log('Table might not have branchId yet or not exist.')
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
