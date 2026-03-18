import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

const TIERS = [
  { count: 1,  bonus: 100,  label: 'Starter',      color: '#888' },
  { count: 5,  bonus: 700,  label: 'Rising',        color: '#A78BFA' },
  { count: 20, bonus: 3000, label: 'Elite',         color: '#F2BA0E' },
  { count: 50, bonus: 0,    label: 'VIP Investor',  color: '#0ECB81' },
]

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000'

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { referralCode: true, referralRewardBalance: true, name: true },
  })

  const referrals = await prisma.referral.findMany({
    where: { referrerId: user.id },
    include: {
      referred: { select: { name: true, email: true, createdAt: true, kycStatus: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const rewards = await prisma.referralReward.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  const qualified = referrals.filter(r => r.status === 'QUALIFIED' || r.status === 'REWARDED').length
  const pending   = referrals.filter(r => r.status === 'PENDING').length
  const totalEarned = rewards.reduce((s, r) => s + r.amount, 0)

  const l1Referrals = referrals
  const l2ReferralIds = referrals.map(r => r.referredId)
  const l2 = l2ReferralIds.length > 0
    ? await prisma.referral.findMany({ where: { referrerId: { in: l2ReferralIds } } })
    : []
  const l3ReferralIds = l2.map(r => r.referredId)
  const l3 = l3ReferralIds.length > 0
    ? await prisma.referral.findMany({ where: { referrerId: { in: l3ReferralIds } } })
    : []

  const currentTierIdx = TIERS.reduce((acc, tier, i) => (qualified >= tier.count ? i : acc), -1)
  const nextTier = TIERS[currentTierIdx + 1] || null

  const campaigns = await prisma.campaign.findMany({
    where: { isActive: true, endDate: { gte: new Date() } },
    include: {
      progresses: { where: { userId: user.id } },
    },
  })

  const campaignsWithProgress = campaigns.map(c => ({
    ...c,
    userCount: c.progresses[0]?.count || 0,
    rewarded: c.progresses[0]?.rewarded || false,
  }))

  return NextResponse.json({
    referralCode: dbUser?.referralCode,
    referralLink: `${appUrl}/signup?ref=${dbUser?.referralCode}`,
    rewardBalance: dbUser?.referralRewardBalance || 0,
    stats: {
      totalInvited: referrals.length,
      qualified,
      pending,
      totalEarned,
    },
    tiers: TIERS,
    currentTierIdx,
    nextTier,
    qualifiedForCurrentTier: qualified,
    referrals: referrals.map(r => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      qualifiedAt: r.qualifiedAt,
      referred: {
        name: r.referred.name,
        email: r.referred.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        createdAt: r.referred.createdAt,
        kycStatus: r.referred.kycStatus,
      },
      steps: {
        signedUp: true,
        emailVerified: r.emailVerified,
        kycApproved: r.kycApproved,
        depositMade: r.depositMade,
      },
    })),
    rewards: rewards.map(r => ({ id: r.id, amount: r.amount, reason: r.reason, createdAt: r.createdAt })),
    multiLevel: {
      l1: l1Referrals.length,
      l2: l2.length,
      l3: l3.length,
    },
    campaigns: campaignsWithProgress,
  })
}
