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

const serverBaseUrl =
  normalizeBaseUrl(process.env.BETTER_AUTH_URL) ||
  normalizeBaseUrl(process.env.SERVER_URL) ||
  `http://localhost:${process.env.PORT || 5000}`

const trustedOrigins = Array.from(
  new Set(
    parseOrigins(
      process.env.CLIENT_URL,
      process.env.CLIENT_ORIGIN,
      process.env.TRUSTED_ORIGINS,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      serverBaseUrl
    )
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
      }
    }
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const accountType = user.accountType || ACCOUNT_TYPES.USER
          const adminRole = user.adminRole || null

          if (![ACCOUNT_TYPES.USER, ACCOUNT_TYPES.ADMIN].includes(accountType)) {
            throw new Error('accountType must be user or admin')
          }

          if (accountType === ACCOUNT_TYPES.ADMIN && !ADMIN_ROLES.includes(adminRole)) {
            throw new Error('Invalid admin role')
          }

          return {
            data: {
              ...user,
              accountType,
              adminRole: accountType === ACCOUNT_TYPES.ADMIN ? adminRole : null
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
