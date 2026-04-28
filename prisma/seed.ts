import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const BRANCHES = [
  { id: "remera", name: "Simba Supermarket Remera" },
  { id: "kimironko", name: "Simba Supermarket Kimironko" },
  { id: "kacyiru", name: "Simba Supermarket Kacyiru" },
  { id: "nyamirambo", name: "Simba Supermarket Nyamirambo" },
  { id: "gikondo", name: "Simba Supermarket Gikondo" },
  { id: "kanombe", name: "Simba Supermarket Kanombe" },
  { id: "kinyinya", name: "Simba Supermarket Kinyinya" },
  { id: "kibagabaga", name: "Simba Supermarket Kibagabaga" },
  { id: "nyanza", name: "Simba Supermarket Nyanza" },
];

async function main() {
  console.log('Seeding branches...')
  for (const b of BRANCHES) {
    await prisma.branch.upsert({
      where: { id: b.id },
      update: { name: b.name },
      create: { id: b.id, name: b.name, location: b.id }
    })
  }
  console.log('Seeding complete.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
