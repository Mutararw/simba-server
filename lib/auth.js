import { betterAuth } from 'better-auth'
import { toNodeHandler } from 'better-auth/node'
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

          return {
            data: {
              ...user,
              accountType,
              isApproved: accountType === ACCOUNT_TYPES.USER, // Customers are auto-approved
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

export const authHandler = toNodeHandler(auth)
