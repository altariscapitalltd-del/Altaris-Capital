import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/push'

const MINIMUM_QUALIFYING_DEPOSIT = 500
const TIER_MILESTONES = [
  { referrals: 1, amount: 100, title: 'Starter milestone' },
  { referrals: 5, amount: 700, title: 'Growth milestone' },
  { referrals: 20, amount: 3000, title: 'Scale milestone' },
]

export function generateReferralCode(name: string, email: string) {
  const base = `${name}${email}`.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 6) || 'ALTARI'
  return `${base}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export async function createUniqueReferralCode(name: string, email: string) {
  for (let i = 0; i < 10; i++) {
    const referralCode = generateReferralCode(name, email)
    const existing = await prisma.user.findUnique({ where: { referralCode } })
    if (!existing) return referralCode
  }
  return `ALT${Date.now().toString(36).toUpperCase()}`
}

async function creditReward(userId: string, amount: number, type: any, title: string, description: string, referralId?: string, campaignId?: string) {
  const duplicate = await prisma.rewardLedger.findFirst({ where: { userId, type, title, ...(referralId ? { referralId } : {}), ...(campaignId ? { campaignId } : {}) } })
  if (duplicate) return duplicate

  await prisma.user.update({ where: { id: userId }, data: { rewardBalance: { increment: amount } } })
  return prisma.rewardLedger.create({
    data: { userId, amount, type, title, description, referralId, campaignId },
  })
}

async function updateTierMilestones(referrerId: string) {
  const qualifiedCount = await prisma.referral.count({ where: { referrerId, status: 'QUALIFIED' } })
  for (const tier of TIER_MILESTONES) {
    if (qualifiedCount < tier.referrals) continue
    const existing = await prisma.rewardLedger.findFirst({ where: { userId: referrerId, type: 'TIER_MILESTONE', title: tier.title } })
    if (existing) continue
    await creditReward(referrerId, tier.amount, 'TIER_MILESTONE', tier.title, `${tier.referrals} qualified referrals milestone reward.`)
    await notifyUser(prisma, referrerId, 'Referral milestone unlocked', `You reached ${tier.referrals} qualified referrals and earned $${tier.amount}.`, '/wallet')
  }
}

async function updateCampaignRewards(referrerId: string) {
  const now = new Date()
  const campaigns = await prisma.referralCampaign.findMany({ where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } } })
  if (!campaigns.length) return

  for (const campaign of campaigns) {
    const qualifiedCount = await prisma.referral.count({
      where: { referrerId, status: 'QUALIFIED', qualifiedAt: { gte: campaign.startAt, lte: campaign.endAt } },
    })
    if (qualifiedCount < campaign.requiredReferrals) continue
    const existing = await prisma.rewardLedger.findFirst({ where: { userId: referrerId, campaignId: campaign.id, type: 'CAMPAIGN_BONUS' } })
    if (existing) continue
    await creditReward(referrerId, campaign.rewardAmount, 'CAMPAIGN_BONUS', campaign.name, campaign.description, undefined, campaign.id)
    await notifyUser(prisma, referrerId, 'Campaign reward earned', `${campaign.name} completed. $${campaign.rewardAmount} has been credited to your rewards balance.`, '/wallet')
  }
}

async function createCommissionChain(userId: string, baseAmount: number) {
  const source = await prisma.user.findUnique({ where: { id: userId }, select: { referredById: true } })
  const levels = [
    { pct: 0.1, type: 'COMMISSION_LEVEL_1', level: 1 },
    { pct: 0.05, type: 'COMMISSION_LEVEL_2', level: 2 },
    { pct: 0.02, type: 'COMMISSION_LEVEL_3', level: 3 },
  ] as const

  let currentId = source?.referredById || null
  for (const item of levels) {
    if (!currentId) break
    const amount = Number((baseAmount * item.pct).toFixed(2))
    await creditReward(currentId, amount, item.type, `Level ${item.level} network commission`, `You earned ${Math.round(item.pct * 100)}% commission from a qualified network deposit.`)
    await notifyUser(prisma, currentId, 'Network commission credited', `A level ${item.level} referral deposit generated $${amount} in commission.`, '/wallet')
    const next = await prisma.user.findUnique({ where: { id: currentId }, select: { referredById: true } })
    currentId = next?.referredById || null
  }
}

export async function markReferralEmailVerified(userId: string) {
  const referral = await prisma.referral.findUnique({ where: { referredUserId: userId } })
  if (!referral) return
  await prisma.referral.update({ where: { referredUserId: userId }, data: { emailVerified: true } })
  await notifyUser(prisma, referral.referrerId, 'New referral signup verified', 'Your referred user just verified their email. Keep them moving toward qualification.', '/wallet')
}

export async function markReferralKycStatus(userId: string, approved: boolean) {
  const referral = await prisma.referral.findUnique({ where: { referredUserId: userId } })
  if (!referral) return
  await prisma.referral.update({ where: { referredUserId: userId }, data: { identityVerified: approved, status: approved ? referral.status : 'PENDING' } })
}

export async function tryQualifyReferral(userId: string) {
  const referral = await prisma.referral.findUnique({ where: { referredUserId: userId }, include: { referrer: true, referredUser: true } })
  if (!referral || referral.status === 'QUALIFIED') return referral

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { transactions: { where: { type: 'DEPOSIT', status: 'SUCCESS' }, orderBy: { createdAt: 'asc' } } },
  })
  if (!user) return referral

  const emailVerified = Boolean(user.emailVerifiedAt)
  const identityVerified = user.kycStatus === 'APPROVED'
  const qualifyingDeposit = user.transactions.find((tx) => tx.amount >= MINIMUM_QUALIFYING_DEPOSIT)
  const minimumDepositMet = Boolean(qualifyingDeposit)

  const updated = await prisma.referral.update({
    where: { referredUserId: userId },
    data: {
      emailVerified,
      identityVerified,
      minimumDepositMet,
      status: emailVerified && identityVerified && minimumDepositMet ? 'QUALIFIED' : 'PENDING',
      qualifiedAt: emailVerified && identityVerified && minimumDepositMet ? (referral.qualifiedAt || new Date()) : null,
    },
  })

  if (updated.status === 'QUALIFIED') {
    await creditReward(referral.referrerId, 200, 'REFERRAL_REFERRER', 'Qualified referral bonus', `${user.name} completed signup, verification, and a qualifying deposit.`, updated.id)
    await creditReward(userId, 100, 'REFERRAL_NEW_USER', 'Welcome referral reward', 'Your account qualified through a referral and your bonus is now available.', updated.id)
    await updateTierMilestones(referral.referrerId)
    await updateCampaignRewards(referral.referrerId)
    await createCommissionChain(userId, qualifyingDeposit!.amount)
    await notifyUser(prisma, referral.referrerId, 'Referral reward credited', 'Your friend just invested. Your referral bonus is now available.', '/wallet')
    await notifyUser(prisma, userId, 'Referral reward credited', 'Your $100 referral reward has been added to your rewards balance.', '/wallet')
  }

  return updated
}

export async function createReferralFromCode(referredUserId: string, referralCode?: string | null) {
  if (!referralCode) return null
  const referrer = await prisma.user.findUnique({ where: { referralCode }, select: { id: true } })
  if (!referrer || referrer.id === referredUserId) return null

  const existing = await prisma.referral.findUnique({ where: { referredUserId } })
  if (existing) return existing

  await prisma.user.update({ where: { id: referredUserId }, data: { referredById: referrer.id } })
  return prisma.referral.create({ data: { referrerId: referrer.id, referredUserId, referralCode } })
}

export async function getRewardsDashboard(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      referralsMade: { include: { referredUser: { select: { name: true, createdAt: true } } }, orderBy: { createdAt: 'desc' } },
      rewardLedger: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!user) return null

  const totalInvited = user.referralsMade.length
  const qualifiedReferrals = user.referralsMade.filter((r) => r.status === 'QUALIFIED').length
  const pendingReferrals = totalInvited - qualifiedReferrals
  const totalReferralEarnings = user.rewardLedger.reduce((sum, item) => sum + item.amount, 0)
  const tier = qualifiedReferrals >= 50 ? 'VIP Investor' : qualifiedReferrals >= 20 ? 'Scale' : qualifiedReferrals >= 5 ? 'Growth' : qualifiedReferrals >= 1 ? 'Starter' : 'Explorer'
  const nextTierTarget = qualifiedReferrals < 1 ? 1 : qualifiedReferrals < 5 ? 5 : qualifiedReferrals < 20 ? 20 : qualifiedReferrals < 50 ? 50 : 50

  const leaderboardWindowStart = new Date()
  leaderboardWindowStart.setUTCDate(leaderboardWindowStart.getUTCDate() - 30)
  const leaderboard = await prisma.referral.groupBy({
    by: ['referrerId'],
    where: { status: 'QUALIFIED', qualifiedAt: { gte: leaderboardWindowStart } },
    _count: { referrerId: true },
    orderBy: { _count: { referrerId: 'desc' } },
    take: 10,
  })
  const users = await prisma.user.findMany({ where: { id: { in: leaderboard.map((item) => item.referrerId) } }, select: { id: true, name: true } })
  const leaderboardRows = leaderboard.map((item, index) => ({ rank: index + 1, user: users.find((u) => u.id === item.referrerId)?.name || 'Investor', totalReferrals: item._count.referrerId }))

  const now = new Date()
  const campaigns = await prisma.referralCampaign.findMany({ where: { isActive: true, endAt: { gte: now } }, orderBy: { endAt: 'asc' }, take: 3 })

  const level1Count = qualifiedReferrals
  const level2Count = await prisma.referral.count({ where: { referrer: { referredById: userId }, status: 'QUALIFIED' } })
  const level3Count = await prisma.referral.count({ where: { referrer: { referredBy: { referredById: userId } }, status: 'QUALIFIED' } })
  const networkEarnings = user.rewardLedger.filter((item) => item.type.startsWith('COMMISSION_LEVEL_')).reduce((sum, item) => sum + item.amount, 0)

  return {
    referralCode: user.referralCode,
    referralLink: `${process.env.NEXT_PUBLIC_APP_URL || ''}/signup?ref=${user.referralCode}`,
    rewardBalance: user.rewardBalance,
    stats: { totalInvited, qualifiedReferrals, pendingReferrals, totalReferralEarnings, currentTier: tier, nextTierTarget },
    vipBenefits: qualifiedReferrals >= 50 ? ['Free stock reward', '90% cashback protection during the first month of a market dip', 'Access to exclusive investment benefits'] : [],
    referrals: user.referralsMade.map((ref) => ({ id: ref.id, name: ref.referredUser.name, createdAt: ref.createdAt, status: ref.status, emailVerified: ref.emailVerified, identityVerified: ref.identityVerified, minimumDepositMet: ref.minimumDepositMet })),
    rewards: user.rewardLedger,
    campaigns,
    leaderboard: leaderboardRows,
    network: { level1Count, level2Count, level3Count, totalNetworkEarnings: networkEarnings },
    milestoneCelebration: [1, 5, 20, 50].includes(qualifiedReferrals),
  }
}
