const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const r1 = await prisma.$executeRaw`UPDATE "transactions" SET type = 'TRANSFER_OUT' WHERE type = 'TRANSFER' AND note NOT ILIKE 'Received from %';`;
  const r2 = await prisma.$executeRaw`UPDATE "transactions" SET type = 'TRANSFER_IN' WHERE type = 'TRANSFER' AND note ILIKE 'Received from %';`;
  console.log('Migration applied:', r1, r2);
}
main().catch((e) => console.error(e)).finally(() => prisma.$disconnect());
