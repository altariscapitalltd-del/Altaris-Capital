import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { buildReferralLink, REFERRAL_MIN_DEPOSIT, REFERRAL_TIERS, MULTI_LEVEL_COMMISSIONS, recomputeLeaderboard } from '@/lib/referrals'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59))
  await prisma.referralCampaign.upsert({
    where: { id: 'monthly-growth-campaign' },
    update: { startAt: monthStart, endAt: monthEnd, isActive: true },
    create: {
      id: 'monthly-growth-campaign',
      title: 'Refer 10 friends this month and earn a $1000 bonus',
      description: 'Limited-time monthly referral sprint.',
      startAt: monthStart,
      endAt: monthEnd,
      targetQualified: 10,
      bonusAmount: 1000,
      isActive: true,
    },
  })

  await recomputeLeaderboard(prisma)

  const [dbUser, referrals, rewardLedger, campaigns, leaderboardWeekly, leaderboardMonthly] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { referralCode: true, rewardBalance: true, vipInvestor: true } }),
    prisma.referral.findMany({ where: { referrerUserId: user.id }, include: { referredUser: { select: { id: true, name: true, email: true, createdAt: true, kycStatus: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.rewardLedger.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.referralCampaign.findMany({ where: { isActive: true }, include: { rewards: { where: { userId: user.id } } }, orderBy: { startAt: 'asc' } }),
    prisma.referralLeaderboardEntry.findMany({ where: { period: 'WEEKLY' }, include: { user: { select: { name: true } } }, orderBy: { rank: 'asc' }, take: 10 }),
    prisma.referralLeaderboardEntry.findMany({ where: { period: 'MONTHLY' }, include: { user: { select: { name: true } } }, orderBy: { rank: 'asc' }, take: 10 }),
  ])

  const qualifiedReferrals = referrals.filter((ref) => ref.status === 'QUALIFIED')
  const pendingReferrals = referrals.filter((ref) => ref.status !== 'QUALIFIED')
  const totalReferralEarnings = rewardLedger.reduce((sum, entry) => sum + entry.amount, 0)
  const currentQualified = qualifiedReferrals.length
  const nextTier = REFERRAL_TIERS.find((tier) => currentQualified < tier.threshold) || null
  const currentTier = [...REFERRAL_TIERS].reverse().find((tier) => currentQualified >= tier.threshold) || null

  const level1Ids = referrals.map((ref) => ref.referredUserId)
  const level2Users = level1Ids.length ? await prisma.user.findMany({ where: { referredByUserId: { in: level1Ids } }, select: { id: true } }) : []
  const level2Ids = level2Users.map((item) => item.id)
  const level3Users = level2Ids.length ? await prisma.user.findMany({ where: { referredByUserId: { in: level2Ids } }, select: { id: true } }) : []

  const byLevel = Object.fromEntries(MULTI_LEVEL_COMMISSIONS.map((entry) => [entry.level, 0])) as Record<number, number>
  rewardLedger.filter((entry) => entry.type === 'REFERRAL_COMMISSION' && entry.level).forEach((entry) => { byLevel[entry.level!] += entry.amount })

  return NextResponse.json({
    referralCode: dbUser?.referralCode,
    referralLink: buildReferralLink(dbUser?.referralCode || ''),
    minDeposit: REFERRAL_MIN_DEPOSIT,
    rewardBalance: dbUser?.rewardBalance || 0,
    vipInvestor: !!dbUser?.vipInvestor,
    stats: {
      totalInvitedUsers: referrals.length,
      qualifiedReferrals: qualifiedReferrals.length,
      pendingReferrals: pendingReferrals.length,
      totalReferralEarnings,
      currentTier: currentTier?.label || 'No tier yet',
      currentQualified,
      nextTier,
      progressPercent: nextTier ? Math.min(100, Math.round((currentQualified / nextTier.threshold) * 100)) : 100,
      network: {
        level1Referrals: referrals.length,
        level2Referrals: level2Users.length,
        level3Referrals: level3Users.length,
        totalNetworkEarnings: rewardLedger.filter((entry) => entry.type === 'REFERRAL_COMMISSION').reduce((sum, entry) => sum + entry.amount, 0),
        levelEarnings: byLevel,
      },
    },
    tierMilestones: REFERRAL_TIERS,
    directRewards: { referrer: 200, newUser: 100 },
    campaigns: campaigns.map((campaign) => ({ id: campaign.id, title: campaign.title, description: campaign.description, targetQualified: campaign.targetQualified, bonusAmount: campaign.bonusAmount, endAt: campaign.endAt, achieved: campaign.rewards.length > 0, progress: Math.min(currentQualified, campaign.targetQualified) })),
    leaderboard: { weekly: leaderboardWeekly, monthly: leaderboardMonthly },
    activity: referrals.map((ref) => ({ id: ref.id, name: ref.referredUser.name, email: ref.referredUser.email, status: ref.status, createdAt: ref.createdAt, qualifiedAt: ref.qualifiedAt })),
    ledger: rewardLedger,
    prompts: [
      'You just earned profit from your investment. Invite friends and earn referral bonuses for every investor you bring.',
      'After a successful withdrawal, share your link and keep your referral progress moving.',
      'Completed an investment plan? Invite friends to unlock the next bonus tier faster.',
    ],
  })
}
