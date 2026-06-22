import { prisma } from '../lib/prisma.js'
import { auth } from '../lib/auth.js'

const SEED_USER = {
  name: 'david',
  email: 'davidkajyojyintwari@gmail.com',
  password: 'Mutara12'
}

export async function seedDefaultUser() {
  try {
    const existing = await prisma.user.findUnique({ where: { email: SEED_USER.email } })
    if (existing) {
      console.log('Seed user already exists, skipping')
      return
    }

    await auth.api.signUpEmail({
      body: {
        name: SEED_USER.name,
        email: SEED_USER.email,
        password: SEED_USER.password,
        accountType: 'admin',
        adminRole: 'manager',
        isApproved: true
      },
      headers: new Headers({ 'content-type': 'application/json' })
    })
    console.log('Seed user created successfully')
  } catch (error) {
    if (
      error.message?.includes('Unique constraint') ||
      error.message?.includes('already exists') ||
      error.message?.toLowerCase().includes('email_already_exists')
    ) {
      console.log('Seed user already exists (caught)')
    } else {
      console.error('Failed to seed user:', error.message)
    }
  }
}
