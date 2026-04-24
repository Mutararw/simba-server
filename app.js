import express from 'express'
import cors from 'cors'
import productRoutes from './routes/productRoutes.js'
import orderRoutes from './routes/orderRoutes.js'
import { authHandler } from './lib/auth.js'
import { prisma } from './lib/prisma.js'

const app = express()

const parseOrigins = (...values) =>
  values
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)

const allowedOrigins = Array.from(
  new Set(
    parseOrigins(
      process.env.CLIENT_URL,
      process.env.CLIENT_ORIGIN,
      process.env.TRUSTED_ORIGINS,
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    )
  )
)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }

      return callback(new Error('Origin not allowed by CORS'))
    },
    credentials: true
  })
)

app.use((req, res, next) => {
  if (!req.path.startsWith('/api/auth')) {
    return next()
  }

  return authHandler(req, res)
})

app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return res.json({ status: 'ok', database: 'connected' })
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    })
  }
})

app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)

app.use((error, _req, res, _next) => {
  return res.status(500).json({
    message: 'Unexpected server error',
    error: error.message
  })
})

export default app
