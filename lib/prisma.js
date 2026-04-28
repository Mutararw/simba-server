import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import pg from 'pg'

const globalForPrisma = globalThis

const createAdapter = () => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  })
  return new PrismaPg(pool)
}

const adapter = globalForPrisma.prismaAdapter || createAdapter()

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaAdapter = adapter
  globalForPrisma.prisma = prisma
}
