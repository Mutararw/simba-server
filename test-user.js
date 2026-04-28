import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function check() {
  try {
    const user = await prisma.user.findUnique({ 
      where: { email: 'davidkajyojyi@gmail.com' },
      include: { accounts: true }
    });
    console.log('USER_CHECK_RESULT:', JSON.stringify(user, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    , 2));
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

check();
