import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getMinReferralDeposit } from '@/lib/referrals'

const TIERS = [
  { referrals: 1, reward: '$100 bonus', name: 'Starter' },
  { referrals: 5, reward: '$700 bonus', name: 'Builder' },
  { referrals: 20, reward: '$3000 bonus', name: 'Elite' },
  { referrals: 50, reward: 'VIP Investor', name: 'VIP Investor' },
]

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const now = new Date()
  const [fullUser, directReferrals, rewards, campaigns] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { id: true, referralCode: true, rewardBalance: true, vipInvestor: true, referredById: true } }),
    prisma.referral.findMany({ where: { referrerId: user.id }, include: { referee: { select: { name: true, email: true, createdAt: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.referralReward.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.referralCampaign.findMany({ where: { isActive: true }, orderBy: { endAt: 'asc' } }),
  ])
  if (!fullUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const pending = directReferrals.filter((r) => r.status !== 'QUALIFIED').length
  const qualified = directReferrals.filter((r) => r.status === 'QUALIFIED').length
  const totalEarnings = rewards.reduce((sum, reward) => sum + reward.amount, 0)
  const totalInvited = directReferrals.length
  const nextTier = TIERS.find((tier) => qualified < tier.referrals) || TIERS[TIERS.length - 1]
  const currentTier = [...TIERS].reverse().find((tier) => qualified >= tier.referrals)?.name || 'Explorer'

  const networkLevels = await Promise.all([1, 2, 3].map(async (level) => {
    let frontier = [user.id]
    const seen = new Set(frontier)
    for (let depth = 0; depth < level; depth += 1) {
      const found = await prisma.user.findMany({ where: { referredById: { in: frontier } }, select: { id: true } })
      frontier = found.map((entry) => entry.id).filter((id) => !seen.has(id))
      frontier.forEach((id) => seen.add(id))
      if (frontier.length === 0) break
    }
    return frontier.length
  }))

  const campaignProgress = await Promise.all(campaigns.map(async (campaign) => {
    const current = await prisma.referral.count({ where: { referrerId: user.id, status: 'QUALIFIED', qualifiedAt: { gte: campaign.startAt, lte: campaign.endAt } } })
    const rewarded = await prisma.referralCampaignBonus.findUnique({ where: { campaignId_userId: { campaignId: campaign.id, userId: user.id } } })
    return { ...campaign, current, rewarded: Boolean(rewarded) }
  }))

  return NextResponse.json({
    rewardBalance: fullUser.rewardBalance,
    referralCode: fullUser.referralCode,
    referralLink: `${process.env.NEXT_PUBLIC_APP_URL || ''}/signup?ref=${fullUser.referralCode}`,
    minDeposit: getMinReferralDeposit(),
    stats: { totalInvited, qualified, pending, totalReferralEarnings: totalEarnings, currentTier },
    progress: {
      current: qualified,
      nextTarget: nextTier.referrals,
      nextReward: nextTier.reward,
      percent: Math.min(100, Math.round((qualified / nextTier.referrals) * 100)),
    },
    tiers: TIERS,
    network: {
      level1: networkLevels[0],
      level2: networkLevels[1],
      level3: networkLevels[2],
      totalNetworkEarnings: rewards.filter((reward) => reward.kind === 'NETWORK_COMMISSION').reduce((sum, reward) => sum + reward.amount, 0),
    },
    vipBenefits: fullUser.vipInvestor ? ['Free stock reward', '90% cashback protection in first market-dip month', 'Exclusive investment benefits'] : [],
    campaigns: campaignProgress.filter((campaign) => campaign.endAt >= now),
    recentRewards: rewards,
    referrals: directReferrals,
  })
}
