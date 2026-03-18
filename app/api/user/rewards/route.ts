import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { REFERRAL_CONFIG, createDefaultCampaignIfMissing } from '@/lib/referrals'

function fallbackRewards(user: { id: string; name: string }) {
  const referralCode = user.id.slice(-8).toUpperCase()
  return {
    me: { id: user.id, name: user.name, referralCode, rewardBalance: 0, rewardEarnings: 0, kycStatus: 'NOT_SUBMITTED', emailVerifiedAt: null },
    stats: {
      totalInvitedUsers: 0,
      qualifiedReferrals: 0,
      pendingReferrals: 0,
      totalReferralEarnings: 0,
      rewardBalance: 0,
      currentTier: 'Not started',
      nextTier: REFERRAL_CONFIG.tierMilestones[0],
      progressToNextTier: 0,
      level1Referrals: 0,
      level2Referrals: 0,
      level3Referrals: 0,
      totalNetworkEarnings: 0,
    },
    referralConfig: REFERRAL_CONFIG,
    referrals: [],
    rewardEvents: [],
    campaigns: [],
    leaderboard: { monthly: [], weekly: [] },
    compatibilityMode: true,
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await createDefaultCampaignIfMissing(prisma)

    const [me, referrals, rewardEvents, activeCampaigns, leaderboardMonthly, leaderboardWeekly] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, referralCode: true, rewardBalance: true, rewardEarnings: true, kycStatus: true, emailVerifiedAt: true },
      }),
      prisma.referral.findMany({
        where: { referrerId: user.id },
        include: { referredUser: { select: { id: true, name: true, email: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.rewardEvent.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 25 }),
      prisma.referralCampaign.findMany({ where: { isActive: true }, orderBy: { startAt: 'desc' } }),
      prisma.referral.groupBy({ by: ['referrerId'], where: { status: 'QUALIFIED', qualifiedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) } }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 10 }),
      prisma.referral.groupBy({ by: ['referrerId'], where: { status: 'QUALIFIED', qualifiedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) } }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 10 }),
    ])

    const leaderboardIds = Array.from(new Set([...leaderboardMonthly, ...leaderboardWeekly].map((entry) => entry.referrerId)))
    const leaderboardUsers = leaderboardIds.length
      ? await prisma.user.findMany({ where: { id: { in: leaderboardIds } }, select: { id: true, name: true } })
      : []
    const nameMap = new Map(leaderboardUsers.map((entry) => [entry.id, entry.name]))

    const qualifiedReferrals = referrals.filter((ref) => ref.status === 'QUALIFIED')
    const pendingReferrals = referrals.filter((ref) => ref.status === 'PENDING')
    const totalReferralEarnings = rewardEvents.reduce((sum, item) => sum + item.amount, 0)
    const nextTier = REFERRAL_CONFIG.tierMilestones.find((tier) => qualifiedReferrals.length < tier.referrals) || null
    const currentTier = [...REFERRAL_CONFIG.tierMilestones].reverse().find((tier) => qualifiedReferrals.length >= tier.referrals) || null

    const directLevel1 = qualifiedReferrals.length
    const level1Ids = qualifiedReferrals.map((ref) => ref.referredUserId)
    const level2 = level1Ids.length ? await prisma.referral.count({ where: { referrerId: { in: level1Ids }, status: 'QUALIFIED' } }) : 0
    const level2Ids = level1Ids.length ? (await prisma.referral.findMany({ where: { referrerId: { in: level1Ids }, status: 'QUALIFIED' }, select: { referredUserId: true } })).map((r) => r.referredUserId) : []
    const level3 = level2Ids.length ? await prisma.referral.count({ where: { referrerId: { in: level2Ids }, status: 'QUALIFIED' } }) : 0
    const networkEarnings = rewardEvents.filter((event) => event.type === 'REFERRAL_COMMISSION').reduce((sum, item) => sum + item.amount, 0)

    const campaigns = await Promise.all(activeCampaigns.map(async (campaign) => {
      const current = await prisma.referral.count({ where: { referrerId: user.id, status: 'QUALIFIED', qualifiedAt: { gte: campaign.startAt, lte: campaign.endAt } } })
      const reward = await prisma.campaignReward.findUnique({ where: { campaignId_userId: { campaignId: campaign.id, userId: user.id } } })
      return { ...campaign, current, completed: Boolean(reward), rewardAwarded: reward?.amount || 0 }
    }))

    return NextResponse.json({
      me,
      stats: {
        totalInvitedUsers: referrals.length,
        qualifiedReferrals: qualifiedReferrals.length,
        pendingReferrals: pendingReferrals.length,
        totalReferralEarnings,
        rewardBalance: me?.rewardBalance || 0,
        currentTier: currentTier?.title || 'Not started',
        nextTier,
        progressToNextTier: nextTier ? Math.min(100, (qualifiedReferrals.length / nextTier.referrals) * 100) : 100,
        level1Referrals: directLevel1,
        level2Referrals: level2,
        level3Referrals: level3,
        totalNetworkEarnings: networkEarnings,
      },
      referralConfig: REFERRAL_CONFIG,
      referrals,
      rewardEvents,
      campaigns,
      leaderboard: {
        monthly: leaderboardMonthly.map((entry, index) => ({ rank: index + 1, userId: entry.referrerId, user: nameMap.get(entry.referrerId) || 'Investor', totalReferrals: entry._count.id })),
        weekly: leaderboardWeekly.map((entry, index) => ({ rank: index + 1, userId: entry.referrerId, user: nameMap.get(entry.referrerId) || 'Investor', totalReferrals: entry._count.id })),
      },
    })
  } catch (error) {
    console.warn('[user/rewards] falling back to compatibility mode', error)
    return NextResponse.json(fallbackRewards({ id: user.id, name: user.name }))
  }
}
