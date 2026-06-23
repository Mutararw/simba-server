import { prisma } from '../lib/prisma.js'
import { auth } from '../lib/auth.js'

const SEED_USERS = [
  {
    name: 'david',
    email: 'davidkajyojyintwari@gmail.com',
    password: 'Mutara123',
    accountType: 'admin',
    adminRole: 'manager',
    isApproved: true
  },
  {
    name: 'Test Customer',
    email: 'test@customer.gmail.com',
    password: 'Testing123',
    accountType: 'user',
    isApproved: true
  }
]

export async function seedDefaultUser() {
  for (const u of SEED_USERS) {
    try {
      const existing = await prisma.user.findUnique({ where: { email: u.email } })
      if (existing) {
        console.log(`Seed user ${u.email} already exists, deleting to recreate with new password`)
        try {
          await prisma.user.delete({ where: { email: u.email } })
          console.log(`Deleted existing user ${u.email}`)
        } catch (delErr) {
          console.error(`Failed to delete existing user ${u.email}:`, delErr?.message || delErr)
          continue
        }
      }

      await auth.api.signUpEmail({
        body: {
          name: u.name,
          email: u.email,
          password: u.password,
          accountType: u.accountType,
          adminRole: u.adminRole || null,
          isApproved: u.isApproved,
          emailVerified: new Date()
        },
        headers: new Headers({ 'content-type': 'application/json' })
      })
      console.log(`Seed user ${u.email} created successfully`)
    } catch (error) {
      const msg = error?.message || String(error)
      if (
        msg.includes('Unique constraint') ||
        msg.includes('already exists') ||
        msg.toLowerCase().includes('email_already_exists')
      ) {
        console.log(`Seed user ${u.email} already exists (caught)`)
      } else if (msg.includes('emailVerified')) {
        console.log(`Seed user ${u.email} creation skipped (emailVerified compatibility issue)`)
      } else {
        console.error(`Failed to seed user ${u.email}:`, msg)
      }
    }
  }
}
