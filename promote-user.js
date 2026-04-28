import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import 'dotenv/config'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function update() {
  try {
    const user = await prisma.user.update({ 
      where: { email: 'davidkajyojyi@gmail.com' },
      data: { accountType: 'admin' }
    });
    console.log('UPDATE_SUCCESS:', user.email, 'is now', user.accountType);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

update();
