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
    name: 'david',
    email: 'david.kajyojyi@a2sv.org',
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
        console.log(`Seed user ${u.email} already exists, updating`)
        try {
          await prisma.user.update({
            where: { email: u.email },
            data: {
              name: u.name,
              accountType: u.accountType,
              adminRole: u.adminRole || null,
              isApproved: u.isApproved
            }
          })
          console.log(`Updated existing user ${u.email}`)
        } catch (updErr) {
          console.error(`Failed to update existing user ${u.email}:`, updErr?.message || updErr)
        }
        continue
      }

      await auth.api.signUpEmail({
        body: {
          name: u.name,
          email: u.email,
          password: u.password,
          accountType: u.accountType,
          adminRole: u.adminRole || null,
          emailVerified: new Date()
        },
        headers: new Headers({ 'content-type': 'application/json' })
      })
      console.log(`Seed user ${u.email} created successfully`)

      // Manually approve the user to ensure isApproved is set correctly
      if (u.isApproved) {
        await prisma.user.update({
          where: { email: u.email },
          data: { isApproved: true }
        })
        console.log(`Seed user ${u.email} approved`)
      }
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
