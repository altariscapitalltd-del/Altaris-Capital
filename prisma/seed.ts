import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function getSeedValue(key: string, fallback?: string) {
  const value = process.env[key]?.trim()
  if (value) return value
  if (process.env.NODE_ENV !== 'production' && fallback) return fallback
  throw new Error(`Missing required environment variable: ${key}`)
}

async function main() {
  console.log('Seeding database...')
  const adminEmail = getSeedValue('SEED_ADMIN_EMAIL', 'admin@altariscapital.ltd')
  const adminPassword = getSeedValue('SEED_ADMIN_PASSWORD', 'ChangeMe-Admin-123!')
  const demoEmail = getSeedValue('SEED_DEMO_EMAIL', 'demo@altariscapital.ltd')
  const demoPassword = getSeedValue('SEED_DEMO_PASSWORD', 'ChangeMe-Demo-123!')

  const adminHash = await bcrypt.hash(adminPassword, 12)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Super Admin',
      email: adminEmail,
      passwordHash: adminHash,
      role: 'SUPER_ADMIN',
      kycStatus: 'APPROVED',
      emailVerifiedAt: new Date(),
      referralCode: 'ALTADMIN1',
      balances: { create: [{ currency: 'USD', amount: 0 }, { currency: 'BTC', amount: 0 }, { currency: 'ETH', amount: 0 }, { currency: 'USDT', amount: 0 }] },
    },
  })

  await Promise.all([
    prisma.walletAddress.upsert({ where: { currency: 'BTC' }, update: {}, create: { currency: 'BTC', address: 'bc1qx0f66y2gcw20n25k7tj9yfalw04gah493plz9x', updatedBy: admin.id } }),
    prisma.walletAddress.upsert({ where: { currency: 'ETH' }, update: {}, create: { currency: 'ETH', address: '0x3913a2c83a41090A84B72169e9066506d7942e01', updatedBy: admin.id } }),
    prisma.walletAddress.upsert({ where: { currency: 'USDT' }, update: {}, create: { currency: 'USDT', address: '0x3913a2c83a41090A84B72169e9066506d7942e01', updatedBy: admin.id } }),
  ])

  const demoHash = await bcrypt.hash(demoPassword, 12)
  await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      name: 'Demo User',
      email: demoEmail,
      passwordHash: demoHash,
      role: 'USER',
      kycStatus: 'APPROVED',
      emailVerifiedAt: new Date(),
      referralCode: 'ALTDEMO1',
      balances: { create: [{ currency: 'USD', amount: 5000 }, { currency: 'BTC', amount: 0.05 }, { currency: 'ETH', amount: 0.5 }, { currency: 'USDT', amount: 2000 }] },
    },
  })

  const now = new Date()
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59))
  await prisma.referralCampaign.upsert({
    where: { id: 'default-monthly-campaign' },
    update: { title: 'Refer 10 friends this month and earn $1000', targetQualified: 10, rewardAmount: 1000, startsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), endsAt: monthEnd, isActive: true },
    create: { id: 'default-monthly-campaign', title: 'Refer 10 friends this month and earn $1000', description: 'Limited-time growth campaign for power inviters.', targetQualified: 10, rewardAmount: 1000, startsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), endsAt: monthEnd, isActive: true },
  })

  console.log('Database seeded successfully.')
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
