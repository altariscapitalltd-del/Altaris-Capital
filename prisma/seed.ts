import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create super admin
  const adminHash = await bcrypt.hash('Admin@Altaris2024!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@altariscapital.ltd' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@altariscapital.ltd',
      passwordHash: adminHash,
      role: 'SUPER_ADMIN',
      kycStatus: 'APPROVED',
      balances: { create: [
        { currency: 'USD', amount: 0 },
        { currency: 'BTC', amount: 0 },
        { currency: 'ETH', amount: 0 },
        { currency: 'USDT', amount: 0 },
      ]},
    },
  })
  console.log('Admin created:', admin.email)

  // Set default wallet addresses
  await Promise.all([
    prisma.walletAddress.upsert({
      where: { currency: 'BTC' },
      update: {},
      create: { currency:'BTC', address:'bc1qx0f66y2gcw20n25k7tj9yfalw04gah493plz9x', updatedBy: admin.id },
    }),
    prisma.walletAddress.upsert({
      where: { currency: 'ETH' },
      update: {},
      create: { currency:'ETH', address:'0x3913a2c83a41090A84B72169e9066506d7942e01', updatedBy: admin.id },
    }),
    prisma.walletAddress.upsert({
      where: { currency: 'USDT' },
      update: {},
      create: { currency:'USDT', address:'0x3913a2c83a41090A84B72169e9066506d7942e01', updatedBy: admin.id },
    }),
  ])
  console.log('Wallet addresses seeded')

  // Create a demo user
  const demoHash = await bcrypt.hash('Demo@123456', 12)
  const demo = await prisma.user.upsert({
    where: { email: 'demo@altariscapital.ltd' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'demo@altariscapital.ltd',
      passwordHash: demoHash,
      role: 'USER',
      kycStatus: 'APPROVED',
      balances: { create: [
        { currency: 'USD', amount: 5000 },
        { currency: 'BTC', amount: 0.05 },
        { currency: 'ETH', amount: 0.5 },
        { currency: 'USDT', amount: 2000 },
      ]},
    },
  })
  console.log('Demo user created:', demo.email)
  console.log('\nCredentials:')
  console.log('Admin: admin@altariscapital.ltd / Admin@Altaris2024!')
  console.log('Demo:  demo@altariscapital.ltd / Demo@123456')
  console.log('\nAdmin panel: http://localhost:3000/admin/login')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
