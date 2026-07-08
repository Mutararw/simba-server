import 'dotenv/config'
import app from './app.js'
import { prisma } from './lib/prisma.js'
import { seedDefaultUser } from './prisma/seedUser.js'

const PORT = process.env.PORT || 5000

const BRANCHES = [
  { id: "centenary", name: "Centenary House Branch", location: "Kiyovu (Town)" },
  { id: "heights", name: "Kigali Heights Branch", location: "Kimihurura" },
  { id: "gisozi", name: "Gisozi Branch", location: "Gisozi" },
  { id: "remera", name: "Remera Branch", location: "Remera" },
  { id: "kimironko", name: "Kimironko Branch", location: "Kimironko" },
  { id: "kacyiru", name: "Kacyiru Branch", location: "Kacyiru" },
  { id: "nyamirambo", name: "Nyamirambo Branch", location: "Nyamirambo" },
  { id: "gikondo", name: "Gikondo Branch", location: "Gikondo" },
  { id: "kanombe", name: "Kanombe Branch", location: "Kanombe" },
  { id: "kinyinya", name: "Kinyinya Branch", location: "Kinyinya" },
  { id: "kibagabaga", name: "Kibagabaga Branch", location: "Kibagabaga" },
  { id: "nyanza", name: "Nyanza Branch", location: "Nyanza" },
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
      create: { id: b.id, name: b.name, location: b.location }
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
