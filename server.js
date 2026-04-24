import 'dotenv/config'
import app from './app.js'
import { prisma } from './lib/prisma.js'

const PORT = process.env.PORT || 5000

const startServer = async () => {
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })

    const shutdown = async () => {
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
