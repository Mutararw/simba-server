import { prisma } from './lib/prisma.js'

const admin = await prisma.user.findUnique({
  where: { email: 'davidkajyojyintwari@gmail.com' }
})

console.log('Admin user:', JSON.stringify(admin, null, 2))
await prisma.$disconnect()
