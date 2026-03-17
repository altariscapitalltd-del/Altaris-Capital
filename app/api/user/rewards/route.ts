import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ensureMonthlyCampaign } from '@/lib/referrals'

function getPeriodRange(period: string) {
  const now = new Date()
  if (period === 'weekly') {
    const start = new Date(now)
    start.setDate(now.getDate() - 7)
    return { start, end: now }
  }
  const start = new Date(now)
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  return { start, end: now }
}

async function countDescendants(userId: string, depth: number): Promise<number> {
  let current = [userId]
  let total = 0
  for (let i = 0; i < depth; i++) {
    if (current.length === 0) break
    const next = await prisma.user.findMany({ where: { referredById: { in: current } }, select: { id: true } })
    total += next.length
    current = next.map((u) => u.id)
  }
  return total
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'monthly'

  await ensureMonthlyCampaign()

  const me = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, referralCode: true, rewardBalance: true, vipInvestor: true } })
  if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const referrals = await prisma.referral.findMany({ where: { referrerId: user.id }, orderBy: { signedUpAt: 'desc' }, include: { referredUser: { select: { name: true, email: true } } } })
  const qualified = referrals.filter((r) => r.status === 'QUALIFIED').length
  const pending = referrals.length - qualified

  const tierMilestones = [
    { referrals: 1, reward: 100 },
    { referrals: 5, reward: 700 },
    { referrals: 20, reward: 3000 },
    { referrals: 50, reward: 0, vip: true },
  ]
  const nextTier = tierMilestones.find((t) => qualified < t.referrals) || tierMilestones[tierMilestones.length - 1]
  const currentTier = tierMilestones.filter((t) => qualified >= t.referrals).slice(-1)[0] || null

  const now = new Date()
  const campaigns = await prisma.referralCampaign.findMany({ where: { active: true, startAt: { lte: now }, endAt: { gte: now } }, orderBy: { endAt: 'asc' } })
  const campaignProgress = await Promise.all(campaigns.map(async (c) => {
    const count = await prisma.referral.count({ where: { referrerId: user.id, status: 'QUALIFIED', qualifiedAt: { gte: c.startAt, lte: c.endAt } } })
    const rewarded = await prisma.referralCampaignReward.findUnique({ where: { campaignId_userId: { campaignId: c.id, userId: user.id } }, select: { id: true } })
    return { ...c, current: count, completed: !!rewarded }
  }))

  const { start, end } = getPeriodRange(period)
  const leaders = await prisma.referral.groupBy({
    by: ['referrerId'],
    where: { status: 'QUALIFIED', qualifiedAt: { gte: start, lte: end } },
    _count: { _all: true },
    orderBy: { _count: { id: 'desc' } as any },
    take: 10,
  })
  const leaderUsers = leaders.length
    ? await prisma.user.findMany({ where: { id: { in: leaders.map((l: any) => l.referrerId) } }, select: { id: true, name: true, referralCode: true } })
    : []

  const leaderboard = leaders.map((l: any, idx: number) => ({
    rank: idx + 1,
    userId: l.referrerId,
    user: leaderUsers.find((u) => u.id === l.referrerId)?.name || 'User',
    totalReferrals: l._count._all,
  }))

  const earnings = await prisma.referralReward.aggregate({ where: { userId: user.id }, _sum: { amount: true } })
  const level1 = await countDescendants(user.id, 1)
  const level2 = await countDescendants(user.id, 2) - level1
  const level3 = await countDescendants(user.id, 3) - level1 - level2
  const networkEarnings = await prisma.referralReward.aggregate({ where: { userId: user.id, kind: 'NETWORK_COMMISSION' }, _sum: { amount: true } })

  return NextResponse.json({
    referralCode: me.referralCode,
    referralLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup?ref=${me.referralCode}`,
    rewardBalance: me.rewardBalance,
    vipInvestor: me.vipInvestor,
    stats: {
      totalInvited: referrals.length,
      qualified,
      pending,
      totalReferralEarnings: earnings._sum.amount || 0,
      currentTier,
      nextTier,
      nextTierProgress: nextTier ? Math.min(100, (qualified / nextTier.referrals) * 100) : 100,
      level1,
      level2,
      level3,
      totalNetworkEarnings: networkEarnings._sum.amount || 0,
    },
    referrals: referrals.map((r) => ({
      id: r.id,
      status: r.status,
      signedUpAt: r.signedUpAt,
      qualifiedAt: r.qualifiedAt,
      name: r.referredUser.name,
      email: r.referredUser.email,
    })),
    campaignProgress,
    leaderboard,
  })
}
