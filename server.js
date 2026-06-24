import 'dotenv/config'
import app from './app.js'
import { prisma } from './lib/prisma.js'
import { seedDefaultUser } from './prisma/seedUser.js'

const PORT = process.env.PORT || 5000

const BRANCHES = [
  { id: "remera", name: "Simba Supermarket Remera" },
  { id: "kimironko", name: "Simba Supermarket Kimironko" },
  { id: "kacyiru", name: "Simba Supermarket Kacyiru" },
  { id: "nyamirambo", name: "Simba Supermarket Nyamirambo" },
  { id: "gikondo", name: "Simba Supermarket Gikondo" },
  { id: "kanombe", name: "Simba Supermarket Kanombe" },
  { id: "kinyinya", name: "Simba Supermarket Kinyinya" },
  { id: "kibagabaga", name: "Simba Supermarket Kibagabaga" },
  { id: "nyanza", name: "Simba Supermarket Nyanza" },
]

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

const seedBranches = async () => {
  console.log('Seeding branches...')
  for (const b of BRANCHES) {
    await prisma.branch.upsert({
      where: { id: b.id },
      update: { name: b.name },
      create: { id: b.id, name: b.name, location: b.id }
    })
  }
  console.log('Branches seeded.')
}

const startServer = async () => {
  try {
    console.log('Connecting to database...')
    await prisma.$connect()
    console.log('Database connected. Verifying connection...')
    await prisma.$queryRaw`SELECT 1`
    console.log('Connection verified. Seeding data...')
    await seedBranches()
    await seedDefaultUser()
    console.log('Starting server...')
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })

    server.on('error', (error) => {
      console.error('Server error:', error)
    })

    const shutdown = async () => {
      console.log('Shutting down...')
      await prisma.$disconnect()
      server.close(() => {
        process.exit(0)
      })
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (error) {
    console.error('Database connection failed:', error.message)
    process.exit(1)
  }
}

startServer()
