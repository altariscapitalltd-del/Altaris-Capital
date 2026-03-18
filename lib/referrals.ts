import { prisma } from './db'
import { notifyUser } from './push'

export const MINIMUM_QUALIFYING_DEPOSIT = 500

const DIRECT_REFERRER_BONUS = 200
const DIRECT_NEW_USER_BONUS = 100
const TIER_MILESTONES = [
  { referrals: 1, bonus: 100, title: 'Starter tier unlocked' },
  { referrals: 5, bonus: 700, title: 'Growth tier unlocked' },
  { referrals: 20, bonus: 3000, title: 'Elite tier unlocked' },
] as const

const NETWORK_COMMISSIONS = [
  { level: 1, pct: 0.1 },
  { level: 2, pct: 0.05 },
  { level: 3, pct: 0.02 },
] as const

export function generateReferralCode(seed?: string) {
  const base = (seed || Math.random().toString(36).slice(2, 10)).replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return `ALT${base.slice(0, 8).padEnd(8, 'X')}`
}

async function creditReward(userId: string, amount: number, payload: { title: string; description?: string; kind: string; referralId?: string; campaignId?: string; level?: number }) {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { rewardBalance: { increment: amount } } })
    await tx.referralReward.create({
      data: {
        userId,
        amount,
        title: payload.title,
        description: payload.description,
        kind: payload.kind,
        referralId: payload.referralId,
        campaignId: payload.campaignId,
        level: payload.level,
      },
    })
    await tx.transaction.create({
      data: {
        userId,
        type: 'BONUS',
        amount,
        currency: 'USD',
        status: 'SUCCESS',
        note: payload.title,
      },
    })
    const balance = await tx.balance.findFirst({ where: { userId, currency: 'USD' } })
    if (balance) {
      const updated = await tx.balance.update({ where: { id: balance.id }, data: { amount: { increment: amount } } })
      await tx.balanceSnapshot.create({ data: { balanceId: balance.id, amount: updated.amount } })
    }
  })
}

export async function maybeQualifyReferral(referredUserId: string) {
  const referral = await prisma.referral.findUnique({
    where: { referredUserId },
    include: { referrer: true, referredUser: true },
  })
  if (!referral) return null

  const referredUser = referral.referredUser
  const qualifyingDeposit = await prisma.transaction.findFirst({
    where: {
      userId: referredUserId,
      type: 'DEPOSIT',
      status: 'SUCCESS',
      amount: { gte: MINIMUM_QUALIFYING_DEPOSIT },
    },
    orderBy: { createdAt: 'asc' },
  })

  const emailVerified = Boolean(referredUser.emailVerifiedAt)
  const identityVerified = referredUser.kycStatus === 'APPROVED'
  const minimumDepositMet = Boolean(qualifyingDeposit)

  const updated = await prisma.referral.update({
    where: { referredUserId },
    data: {
      emailVerified,
      identityVerified,
      minimumDepositMet,
      lastQualifiedDeposit: qualifyingDeposit?.amount,
      qualifiedAt: referral.qualifiedAt ?? (emailVerified && identityVerified && minimumDepositMet ? new Date() : null),
    },
  })

  if (!updated.qualifiedAt || referral.qualifiedAt) return updated

  await creditReward(referral.referrerId, DIRECT_REFERRER_BONUS, {
    title: 'Qualified referral bonus',
    description: `${referredUser.name} completed verification and a qualifying deposit.`,
    kind: 'qualified_referral_referrer',
    referralId: referral.id,
  })
  await creditReward(referredUserId, DIRECT_NEW_USER_BONUS, {
    title: 'Welcome referral bonus',
    description: 'You qualified through a referral link after verification and deposit.',
    kind: 'qualified_referral_new_user',
    referralId: referral.id,
  })

  await notifyUser(prisma, referral.referrerId, 'Referral qualified', 'Your friend just invested. Your referral bonus is now available.', '/wallet?tab=reward')
  await notifyUser(prisma, referredUserId, 'Referral reward credited', 'Your $100 referral reward is now available in Rewards.', '/wallet?tab=reward')

  await applyTierRewards(referral.referrerId)
  await applyCampaignRewards(referral.referrerId)
  return updated
}

export async function applyTierRewards(userId: string) {
  const qualifiedCount = await prisma.referral.count({ where: { referrerId: userId, qualifiedAt: { not: null } } })
  for (const tier of TIER_MILESTONES) {
    if (qualifiedCount < tier.referrals) continue
    const existing = await prisma.referralReward.findFirst({ where: { userId, kind: `tier_${tier.referrals}` } })
    if (existing) continue
    await creditReward(userId, tier.bonus, {
      title: tier.title,
      description: `You reached ${tier.referrals} qualified referral${tier.referrals > 1 ? 's' : ''}.`,
      kind: `tier_${tier.referrals}`,
    })
    await notifyUser(prisma, userId, 'New referral tier reached', `Congrats! You unlocked the ${tier.referrals}-referral milestone bonus.`, '/wallet?tab=reward')
  }

  if (qualifiedCount >= 50) {
    await prisma.user.update({ where: { id: userId }, data: { vipInvestor: true } })
    const existingVip = await prisma.referralReward.findFirst({ where: { userId, kind: 'vip_50' } })
    if (!existingVip) {
      await prisma.referralReward.create({
        data: {
          userId,
          amount: 0,
          kind: 'vip_50',
          title: 'VIP Investor unlocked',
          description: 'Free stock reward, 90% cashback protection, and exclusive investment benefits are now unlocked.',
        },
      })
      await notifyUser(prisma, userId, 'VIP Investor unlocked', 'You reached 50 referrals and unlocked VIP Investor status.', '/wallet?tab=reward')
    }
  }
}

export async function applyCampaignRewards(userId: string) {
  const campaigns = await prisma.referralCampaign.findMany({
    where: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
  })
  if (!campaigns.length) return

  for (const campaign of campaigns) {
    const existingClaim = await prisma.referralCampaignClaim.findUnique({ where: { campaignId_userId: { campaignId: campaign.id, userId } } })
    if (existingClaim) continue
    const qualifiedInWindow = await prisma.referral.count({
      where: {
        referrerId: userId,
        qualifiedAt: { not: null, gte: campaign.startsAt, lte: campaign.endsAt },
      },
    })
    if (qualifiedInWindow < campaign.targetQualified) continue

    await creditReward(userId, campaign.rewardAmount, {
      title: campaign.title,
      description: campaign.description || 'Campaign milestone reached.',
      kind: 'campaign_bonus',
      campaignId: campaign.id,
    })
    await prisma.referralCampaignClaim.create({ data: { campaignId: campaign.id, userId } })
    await notifyUser(prisma, userId, 'Campaign reward credited', `${campaign.title} reward has been credited to your rewards balance.`, '/wallet?tab=reward')
  }
}

export async function awardNetworkCommissionsFromDeposit(userId: string, amount: number) {
  let current = await prisma.user.findUnique({ where: { id: userId }, select: { referredById: true, name: true } })
  for (const level of NETWORK_COMMISSIONS) {
    if (!current?.referredById) break
    const upstream = await prisma.user.findUnique({ where: { id: current.referredById }, select: { id: true } })
    if (!upstream) break
    const commission = Number((amount * level.pct).toFixed(2))
    if (commission > 0) {
      await creditReward(upstream.id, commission, {
        title: `Level ${level.level} network commission`,
        description: `Commission from a level ${level.level} qualifying deposit.`,
        kind: 'network_commission',
        level: level.level,
      })
      await notifyUser(prisma, upstream.id, 'Network commission credited', `A level ${level.level} referral deposit earned you $${commission.toFixed(2)}.`, '/wallet?tab=reward')
    }
    current = await prisma.user.findUnique({ where: { id: upstream.id }, select: { referredById: true, name: true } })
  }
}

export async function buildRewardsDashboard(userId: string) {
  const [user, directReferrals, rewards, campaigns] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true, rewardBalance: true, vipInvestor: true } }),
    prisma.referral.findMany({
      where: { referrerId: userId },
      include: { referredUser: { select: { name: true, email: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.referralReward.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.referralCampaign.findMany({ where: { isActive: true }, orderBy: { startsAt: 'desc' }, take: 3 }),
  ])

  const totalInvited = directReferrals.length
  const qualified = directReferrals.filter((item) => item.qualifiedAt).length
  const pending = totalInvited - qualified
  const totalEarnings = rewards.reduce((sum, item) => sum + item.amount, 0)
  const nextTier = [1, 5, 20, 50].find((target) => qualified < target) ?? 50
  const leaderboardStart = new Date()
  leaderboardStart.setDate(leaderboardStart.getDate() - 30)
  const leaderboardRaw = await prisma.referral.groupBy({
    by: ['referrerId'],
    where: { qualifiedAt: { not: null, gte: leaderboardStart } },
    _count: { _all: true },
    orderBy: { _count: { referrerId: 'desc' } },
    take: 10,
  })
  const leaderboardUsers = await prisma.user.findMany({ where: { id: { in: leaderboardRaw.map((x) => x.referrerId) } }, select: { id: true, name: true } })
  const nameMap = Object.fromEntries(leaderboardUsers.map((u) => [u.id, u.name]))

  const levelCounts = {
    level1: await prisma.referral.count({ where: { referrerId: userId } }),
    level2: await prisma.user.count({ where: { referredBy: { referredById: userId } } }),
    level3: await prisma.user.count({ where: { referredBy: { referredBy: { referredById: userId } } } }),
  }
  const networkEarnings = rewards.filter((item) => item.kind === 'network_commission').reduce((sum, item) => sum + item.amount, 0)

  return {
    referralCode: user?.referralCode,
    rewardBalance: user?.rewardBalance || 0,
    vipInvestor: Boolean(user?.vipInvestor),
    stats: { totalInvited, qualified, pending, totalEarnings, currentTier: qualified >= 50 ? 'VIP Investor' : `${qualified} referrals` },
    tierProgress: {
      current: qualified,
      nextTier,
      percent: Math.min(100, Math.round((qualified / nextTier) * 100)),
      reward: nextTier === 50 ? 'VIP Investor' : `$${({1:100,5:700,20:3000} as any)[nextTier] || 0} bonus`,
    },
    referrals: directReferrals,
    rewards,
    leaderboard: leaderboardRaw.map((entry, index) => ({ rank: index + 1, user: nameMap[entry.referrerId] || 'User', totalReferrals: entry._count._all })),
    campaigns: await Promise.all(campaigns.map(async (campaign) => ({
      ...campaign,
      qualifiedCount: await prisma.referral.count({ where: { referrerId: userId, qualifiedAt: { not: null, gte: campaign.startsAt, lte: campaign.endsAt } } }),
    }))),
    network: { ...levelCounts, totalNetworkEarnings: networkEarnings },
    vipBenefits: user?.vipInvestor ? ['Free stock reward', '90% cashback protection during first month of a market dip', 'Access to exclusive investment benefits'] : [],
    shareMessage: `I’m using this investment app that manages investments for you. Join with my referral link and get a bonus when you start investing.`,
  }
}
