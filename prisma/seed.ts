import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('Admin@12345', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@altaris.capital' },
    update: {
      name: 'Altaris Admin',
      role: 'ADMIN',
      passwordHash,
      kycStatus: 'APPROVED',
      referralCode: 'ADMIN001',
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'admin@altaris.capital',
      name: 'Altaris Admin',
      role: 'ADMIN',
      passwordHash,
      kycStatus: 'APPROVED',
      referralCode: 'ADMIN001',
      emailVerifiedAt: new Date(),
      balances: { create: [{ currency: 'USD', amount: 0 }] },
    },
  })

  await Promise.all([
    prisma.walletAddress.upsert({ where: { currency: 'BTC' }, update: { address: 'bc1qaltariscapitalbtcaddressdemo0001', updatedBy: admin.id }, create: { currency: 'BTC', address: 'bc1qaltariscapitalbtcaddressdemo0001', updatedBy: admin.id } }),
    prisma.walletAddress.upsert({ where: { currency: 'ETH' }, update: { address: '0xAltarisCapitalEthAddressDemo0000000001', updatedBy: admin.id }, create: { currency: 'ETH', address: '0xAltarisCapitalEthAddressDemo0000000001', updatedBy: admin.id } }),
    prisma.walletAddress.upsert({ where: { currency: 'USDT' }, update: { address: 'TXAltarisCapitalUsdtAddressDemo00000001', updatedBy: admin.id }, create: { currency: 'USDT', address: 'TXAltarisCapitalUsdtAddressDemo00000001', updatedBy: admin.id } }),
  ])

  await prisma.user.upsert({
    where: { email: 'demo@altaris.capital' },
    update: {
      name: 'Demo Investor',
      role: 'USER',
      passwordHash,
      kycStatus: 'APPROVED',
      referralCode: 'DEMO1001',
      emailVerifiedAt: new Date(),
    },
    create: {
      email: 'demo@altaris.capital',
      name: 'Demo Investor',
      role: 'USER',
      passwordHash,
      kycStatus: 'APPROVED',
      referralCode: 'DEMO1001',
      emailVerifiedAt: new Date(),
      balances: { create: [{ currency: 'USD', amount: 10000 }, { currency: 'BTC', amount: 0 }, { currency: 'ETH', amount: 0 }, { currency: 'USDT', amount: 0 }] },
    },
  })

  await prisma.referralCampaign.upsert({
    where: { id: 'default-monthly-campaign' },
    update: {
      title: 'Refer 10 friends this month',
      description: 'Invite 10 qualified investors during the campaign period and earn a $1000 bonus.',
      startAt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      endAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59),
      requiredQualifiedReferrals: 10,
      bonusAmount: 1000,
      isActive: true,
    },
    create: {
      id: 'default-monthly-campaign',
      title: 'Refer 10 friends this month',
      description: 'Invite 10 qualified investors during the campaign period and earn a $1000 bonus.',
      startAt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      endAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59),
      requiredQualifiedReferrals: 10,
      bonusAmount: 1000,
      isActive: true,
    },
  })
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
