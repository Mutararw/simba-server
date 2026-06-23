import 'dotenv/config'
import app from './app.js'
import { prisma } from './lib/prisma.js'

const PORT = process.env.PORT || 5000

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

const startServer = async () => {
  try {
    console.log('Connecting to database...')
    await prisma.$connect()
    console.log('Database connected. Verifying connection...')
    await prisma.$queryRaw`SELECT 1`
    console.log('Connection verified. Starting server...')
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
