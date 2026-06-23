import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './prisma.js'
import { ACCOUNT_TYPES, ADMIN_ROLES } from '../config/roles.js'

const parseOrigins = (...values) => {
  return values
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
}

const normalizeBaseUrl = (value) => value?.replace(/\/+$/, '')

const rawBaseUrl =
  normalizeBaseUrl(process.env.BETTER_AUTH_URL) ||
  normalizeBaseUrl(process.env.SERVER_URL) ||
  `http://localhost:${process.env.PORT || 5000}`

// Ensure baseURL includes the prefix if mounted under /api/auth
const serverBaseUrl = rawBaseUrl.includes('/api/auth') ? rawBaseUrl : `${rawBaseUrl}/api/auth`

const getOrigin = (url) => {
  try {
    return new URL(url).origin
  } catch {
    return url
  }
}

const trustedOrigins = Array.from(
  new Set(
    parseOrigins(
      process.env.CLIENT_URL,
      process.env.CLIENT_ORIGIN,
      process.env.TRUSTED_ORIGINS,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:8080',
      'http://127.0.0.1:8080'
    ).map(getOrigin)
  )
)

export const auth = betterAuth({
  appName: 'Simba',
  baseURL: serverBaseUrl,
  secret: process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET,
  trustedOrigins,
  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),
  emailAndPassword: {
    enabled: true
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET
    }
  },
  user: {
    additionalFields: {
      accountType: {
        type: 'string',
        required: false,
        defaultValue: ACCOUNT_TYPES.USER
      },
      adminRole: {
        type: 'string',
        required: false
      },
      branchId: {
        type: 'string',
        required: false
      },
      isApproved: {
        type: 'boolean',
        required: false,
        defaultValue: true
      }
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const accountType = user.accountType || ACCOUNT_TYPES.USER
          const adminRole = user.adminRole || (accountType === ACCOUNT_TYPES.ADMIN ? 'manager' : null)
          const branchId = user.branchId || null

          const validTypes = [ACCOUNT_TYPES.USER, ACCOUNT_TYPES.ADMIN, ACCOUNT_TYPES.MANAGER, ACCOUNT_TYPES.SUPPLIER]
          if (!validTypes.includes(accountType)) {
            throw new Error('Invalid accountType')
          }

          if (accountType === ACCOUNT_TYPES.ADMIN && !ADMIN_ROLES.includes(adminRole)) {
            throw new Error('Invalid admin role')
          }

          if (accountType === ACCOUNT_TYPES.MANAGER && !branchId) {
            throw new Error('Branch ID is required for managers')
          }

          // Allow auto-approving staff (admin/manager) when enabled via env var
          const autoApproveStaff = process.env.AUTO_APPROVE_STAFF === 'true'

          const defaultApproved = user.isApproved ?? (
            accountType === ACCOUNT_TYPES.USER || (autoApproveStaff && (accountType === ACCOUNT_TYPES.ADMIN || accountType === ACCOUNT_TYPES.MANAGER))
          )

          return {
            data: {
              ...user,
              accountType,
              isApproved: defaultApproved,
              adminRole: accountType === ACCOUNT_TYPES.ADMIN ? adminRole : null,
              branchId: (accountType === ACCOUNT_TYPES.MANAGER || accountType === ACCOUNT_TYPES.ADMIN) ? branchId : null
            }
          }
        }
      }
    }
  },
  advanced: {
    trustedProxyHeaders: true,
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production'
    }
  }
})

function safeSetResponse(res, webResponse) {
  const status = webResponse.status
  const bodyReader = webResponse.body?.getReader()

  res.status(status)

  for (const [key, value] of webResponse.headers) {
    if (key === 'set-cookie') {
      try {
        const cookies = webResponse.headers.getSetCookie()
        if (cookies && cookies.length > 0) {
          res.setHeader('set-cookie', cookies)
        }
      } catch {
        try {
          const raw = webResponse.headers.get(key)
          if (raw) {
            res.setHeader('set-cookie', raw)
          }
        } catch {}
      }
    } else {
      try {
        res.setHeader(key, value)
      } catch {}
    }
  }

  if (!bodyReader) {
    return res.end()
  }

  return new Promise((resolve, reject) => {
    const pump = () => {
      bodyReader.read().then(({ done, value }) => {
        if (done) {
          res.end()
          resolve()
          return
        }
        try {
          if (!res.write(value)) {
            res.once('drain', pump)
            return
          }
        } catch (e) {
          reject(e)
          return
        }
        pump()
      }).catch(reject)
    }
    pump()
  })
}

function getBody(req) {
  return new Promise((resolve) => {
    if (!req.readable) {
      return resolve(null)
    }
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const buf = Buffer.concat(chunks)
      resolve(buf.length ? buf.toString('utf-8') : null)
    })
    req.on('error', () => resolve(null))
  })
}

function constructUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'http'
  const host = req.headers[':authority'] || req.headers.host || 'localhost'
  return `${proto}://${host}${req.originalUrl || req.url}`
}

export async function authHandler(req, res) {
  try {
    const baseUrl = constructUrl(req)
    const body = await getBody(req)

    const request = new Request(baseUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' && body ? body : undefined,
      duplex: 'half',
    })

    const response = await auth.handler(request)
    await safeSetResponse(res, response)
  } catch (error) {
    console.error('Auth error:', error)
    if (!res.headersSent) {
      return res.status(500).json({ message: error.message || 'Auth error' })
    }
  }
}
