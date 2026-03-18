import { PrismaClient } from '@prisma/client'
import { notifyUser } from './push'

export const REFERRAL_MIN_DEPOSIT = Number(process.env.REFERRAL_MIN_DEPOSIT || 500)
export const DIRECT_REFERRER_BONUS = 200
export const DIRECT_NEW_USER_BONUS = 100
export const REFERRAL_TIERS = [
  { threshold: 1, bonus: 100, label: 'Starter' },
  { threshold: 5, bonus: 700, label: 'Builder' },
  { threshold: 20, bonus: 3000, label: 'Pro' },
  { threshold: 50, bonus: 0, label: 'VIP Investor' },
] as const
export const MULTI_LEVEL_COMMISSIONS = [
  { level: 1, rate: 0.1 },
  { level: 2, rate: 0.05 },
  { level: 3, rate: 0.02 },
] as const

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export function buildReferralLink(code: string) {
  return `${getBaseUrl().replace(/\/$/, '')}/signup?ref=${encodeURIComponent(code)}`
}

export function generateReferralCode(name: string) {
  const cleaned = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'ALT'
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${cleaned}${suffix}`
}

async function ensureUsdBalance(tx: any, userId: string) {
  let balance = await tx.balance.findFirst({ where: { userId, currency: 'USD' } })
  if (!balance) {
    balance = await tx.balance.create({ data: { userId, currency: 'USD', amount: 0 } })
  }
  return balance
}

async function creditReward(tx: any, params: { userId: string, amount: number, description: string, type: any, referralId?: string, campaignId?: string, level?: number, metadata?: any }) {
  const balance = await ensureUsdBalance(tx, params.userId)
  const updated = await tx.balance.update({ where: { id: balance.id }, data: { amount: { increment: params.amount } } })
  await tx.balanceSnapshot.create({ data: { balanceId: balance.id, amount: updated.amount } })
  await tx.user.update({ where: { id: params.userId }, data: { rewardBalance: { increment: params.amount } } })
  await tx.transaction.create({
    data: {
      userId: params.userId,
      type: 'BONUS',
      amount: params.amount,
      currency: 'USD',
      status: 'SUCCESS',
      note: params.description,
    },
  })
  return tx.rewardLedger.create({
    data: {
      userId: params.userId,
      amount: params.amount,
      description: params.description,
      type: params.type,
      referralId: params.referralId,
      campaignId: params.campaignId,
      level: params.level,
      metadata: params.metadata,
    },
  })
}

async function awardTierBonuses(prisma: PrismaClient, userId: string, qualifiedCount: number) {
  const existing = await prisma.rewardLedger.findMany({ where: { userId, type: 'REFERRAL_TIER' }, select: { metadata: true } })
  const awarded = new Set(existing.map((entry) => Number((entry.metadata as any)?.threshold)).filter(Boolean))
  const tiers = REFERRAL_TIERS.filter((tier) => tier.bonus > 0 && qualifiedCount >= tier.threshold && !awarded.has(tier.threshold))
  for (const tier of tiers) {
    await prisma.$transaction(async (tx) => {
      await creditReward(tx, {
        userId,
        amount: tier.bonus,
        description: `Referral tier unlocked: ${tier.threshold} qualified referral${tier.threshold > 1 ? 's' : ''}`,
        type: 'REFERRAL_TIER',
        metadata: { threshold: tier.threshold, label: tier.label },
      })
    })
    await notifyUser(prisma, userId, 'New referral tier unlocked', `You reached ${tier.threshold} qualified referrals and earned $${tier.bonus}.`, '/wallet')
  }

  if (qualifiedCount >= 50) {
    await prisma.user.update({ where: { id: userId }, data: { vipInvestor: true } })
  }
}

export async function evaluateCampaigns(prisma: PrismaClient, userId: string, qualifiedCount: number) {
  const now = new Date()
  const campaigns = await prisma.referralCampaign.findMany({
    where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
    include: { rewards: { where: { userId }, select: { id: true } } },
  })

  for (const campaign of campaigns) {
    if (campaign.rewards.length > 0 || qualifiedCount < campaign.targetQualified) continue

    await prisma.$transaction(async (tx) => {
      await tx.referralCampaignReward.create({ data: { campaignId: campaign.id, userId } })
      await creditReward(tx, {
        userId,
        amount: campaign.bonusAmount,
        description: campaign.title,
        type: 'REFERRAL_CAMPAIGN',
        campaignId: campaign.id,
        metadata: { targetQualified: campaign.targetQualified },
      })
    })
    await notifyUser(prisma, userId, 'Campaign bonus unlocked', `You completed ${campaign.title} and earned $${campaign.bonusAmount}.`, '/wallet')
  }
}

export async function recomputeLeaderboard(prisma: PrismaClient) {
  const now = new Date()
  const weeklyStart = new Date(now)
  weeklyStart.setUTCDate(now.getUTCDate() - now.getUTCDay())
  weeklyStart.setUTCHours(0, 0, 0, 0)
  const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  for (const [period, start] of [['WEEKLY', weeklyStart], ['MONTHLY', monthlyStart]] as const) {
    const rows = await prisma.referral.groupBy({
      by: ['referrerUserId'],
      where: { status: 'QUALIFIED', qualifiedAt: { gte: start, lte: now } },
      _count: { _all: true },
      orderBy: { _count: { referrerUserId: 'desc' } },
      take: 10,
    })

    await prisma.referralLeaderboardEntry.deleteMany({ where: { period, periodStart: start } })
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]
      await prisma.referralLeaderboardEntry.create({
        data: {
          userId: row.referrerUserId,
          period,
          periodStart: start,
          periodEnd: now,
          successfulReferrals: row._count._all,
          rank: index + 1,
          bonusAmount: index === 0 ? 500 : index === 1 ? 250 : index === 2 ? 100 : 0,
        },
      })
    }
  }
}

export async function evaluateReferralQualification(prisma: PrismaClient, referredUserId: string) {
  const referral = await prisma.referral.findUnique({
    where: { referredUserId },
    include: { referrer: true, referredUser: { select: { id: true, name: true, email: true, kycStatus: true, referredByUserId: true } } },
  })
  if (!referral) return

  const emailVerified = await prisma.oTP.findFirst({ where: { userId: referredUserId, purpose: 'SIGNUP', used: true } })
  const successfulDeposit = await prisma.transaction.findFirst({
    where: { userId: referredUserId, type: 'DEPOSIT', status: 'SUCCESS', amount: { gte: REFERRAL_MIN_DEPOSIT } },
    orderBy: { updatedAt: 'desc' },
  })
  const identityVerified = referral.referredUser.kycStatus === 'APPROVED'

  const nextStatus = successfulDeposit
    ? (emailVerified && identityVerified ? 'QUALIFIED' : 'AWAITING_VERIFICATION')
    : (emailVerified && identityVerified ? 'AWAITING_DEPOSIT' : 'AWAITING_VERIFICATION')

  const alreadyQualified = referral.status === 'QUALIFIED'

  const updatedReferral = await prisma.referral.update({
    where: { id: referral.id },
    data: {
      status: nextStatus,
      emailVerifiedAt: emailVerified ? emailVerified.createdAt : null,
      identityVerifiedAt: identityVerified ? new Date() : null,
      minimumDepositQualifiedAt: successfulDeposit ? successfulDeposit.updatedAt : null,
      latestQualifiedDeposit: successfulDeposit?.amount || 0,
      qualifiedAt: nextStatus === 'QUALIFIED' ? referral.qualifiedAt || new Date() : null,
    },
  })

  if (nextStatus !== 'QUALIFIED' || alreadyQualified) return updatedReferral

  await prisma.$transaction(async (tx) => {
    await creditReward(tx, {
      userId: referral.referrerUserId,
      amount: DIRECT_REFERRER_BONUS,
      description: `${referral.referredUser.name} became a qualified referral`,
      type: 'REFERRAL_QUALIFIED',
      referralId: referral.id,
      metadata: { side: 'referrer' },
    })
    await creditReward(tx, {
      userId: referredUserId,
      amount: DIRECT_NEW_USER_BONUS,
      description: 'Referral join bonus unlocked after verification and deposit',
      type: 'REFERRAL_QUALIFIED',
      referralId: referral.id,
      metadata: { side: 'referred' },
    })

    let ancestorId = referral.referrerUserId
    for (const levelConfig of MULTI_LEVEL_COMMISSIONS) {
      if (!ancestorId) break
      const ancestor = await tx.user.findUnique({ where: { id: ancestorId }, select: { id: true, referredByUserId: true } })
      if (!ancestor) break
      const commissionAmount = Number((successfulDeposit!.amount * levelConfig.rate).toFixed(2))
      await creditReward(tx, {
        userId: ancestor.id,
        amount: commissionAmount,
        description: `Level ${levelConfig.level} network commission from ${referral.referredUser.name}`,
        type: 'REFERRAL_COMMISSION',
        referralId: referral.id,
        level: levelConfig.level,
        metadata: { depositAmount: successfulDeposit!.amount, rate: levelConfig.rate },
      })
      ancestorId = ancestor.referredByUserId || ''
    }
  })

  const qualifiedCount = await prisma.referral.count({ where: { referrerUserId: referral.referrerUserId, status: 'QUALIFIED' } })
  await awardTierBonuses(prisma, referral.referrerUserId, qualifiedCount)
  await evaluateCampaigns(prisma, referral.referrerUserId, qualifiedCount)
  await recomputeLeaderboard(prisma)

  await notifyUser(prisma, referral.referrerUserId, 'Referral bonus credited', `Your friend just invested. Your referral bonus is now available.`, '/wallet')
  await notifyUser(prisma, referredUserId, 'Welcome referral bonus credited', `You received $${DIRECT_NEW_USER_BONUS} after completing verification and your first deposit.`, '/wallet')

  return updatedReferral
}

export async function notifyReferrerOfSignup(prisma: PrismaClient, referredUserId: string) {
  const referral = await prisma.referral.findUnique({ where: { referredUserId }, include: { referredUser: true, referrer: true } })
  if (!referral) return
  await notifyUser(prisma, referral.referrerUserId, 'New referral signup', `${referral.referredUser.name} signed up with your referral link.`, '/wallet')
}
