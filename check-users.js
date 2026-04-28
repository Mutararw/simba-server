import 'dotenv/config'
import { prisma } from './lib/prisma.js'

async function check() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'davidkajyojyi@gmail.com' }
    })
    console.log('User:', JSON.stringify(user, null, 2))

    if (user) {
      const accounts = await prisma.account.findMany({
        where: { userId: user.id }
      })
      console.log('\nAccounts:', JSON.stringify(accounts.map(a => ({
        id: a.id,
        providerId: a.providerId,
        accountId: a.accountId,
        hasPassword: !!a.password,
        passwordLength: a.password ? a.password.length : 0
      })), null, 2))
    }
  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

check()
