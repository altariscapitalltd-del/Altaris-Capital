import { prisma } from './db'
import { notifyUser } from './push'

const MIN_DEPOSIT = Number(process.env.NEXT_PUBLIC_REFERRAL_MIN_DEPOSIT || process.env.REFERRAL_MIN_DEPOSIT || 500)
const LEVEL_RATES = [0.1, 0.05, 0.02]
const TIER_MILESTONES = [
  { referrals: 1, bonus: 100, label: 'Starter tier unlocked' },
  { referrals: 5, bonus: 700, label: 'Builder tier unlocked' },
  { referrals: 20, bonus: 3000, label: 'Elite tier unlocked' },
  { referrals: 50, bonus: 0, label: 'VIP Investor unlocked' },
] as const

export function generateReferralCode(name: string) {
  const prefix = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) || 'ALTA'
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${prefix}${suffix}`
}

export async function uniqueReferralCode(name: string) {
  for (let i = 0; i < 10; i += 1) {
    const code = generateReferralCode(name)
    const exists = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } })
    if (!exists) return code
  }
  return `${generateReferralCode(name)}${Date.now().toString().slice(-4)}`
}

async function ensureRewardBalance(userId: string, txClient: any) {
  const usd = await txClient.balance.findFirst({ where: { userId, currency: 'USD' } })
  if (!usd) {
    await txClient.balance.create({ data: { userId, currency: 'USD', amount: 0 } })
  }
}

export async function creditReferralReward(txClient: any, params: {
  userId: string
  amount: number
  kind: any
  description: string
  referralId?: string
  tierTarget?: number
  campaignId?: string
  level?: number
  sourceTxId?: string
}) {
  await ensureRewardBalance(params.userId, txClient)
  await txClient.user.update({ where: { id: params.userId }, data: { rewardBalance: { increment: params.amount } } })
  const usd = await txClient.balance.findFirst({ where: { userId: params.userId, currency: 'USD' } })
  if (usd) {
    const updated = await txClient.balance.update({ where: { id: usd.id }, data: { amount: { increment: params.amount } } })
    await txClient.balanceSnapshot.create({ data: { balanceId: usd.id, amount: updated.amount } })
  }
  await txClient.transaction.create({
    data: {
      userId: params.userId,
      type: 'BONUS',
      amount: params.amount,
      currency: 'USD',
      status: 'SUCCESS',
      note: params.description,
    },
  })
  return txClient.referralReward.create({
    data: {
      userId: params.userId,
      amount: params.amount,
      kind: params.kind,
      description: params.description,
      referralId: params.referralId,
      tierTarget: params.tierTarget,
      campaignId: params.campaignId,
      level: params.level,
      sourceTxId: params.sourceTxId,
    },
  })
}

export async function createReferralLink(referrerId: string, refereeId: string, codeUsed: string) {
  return prisma.referral.create({
    data: { referrerId, refereeId, codeUsed },
  })
}

export async function refreshReferralProgress(userId: string) {
  const referral = await prisma.referral.findUnique({ where: { refereeId: userId }, include: { referrer: true, referee: true } })
  if (!referral) return null

  const [deposits, referee] = await Promise.all([
    prisma.transaction.aggregate({ where: { userId, type: 'DEPOSIT', status: 'SUCCESS' }, _sum: { amount: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { kycStatus: true, emailVerifiedAt: true } }),
  ])
  if (!referee) return referral

  const nextData: any = {
    emailVerifiedAt: referee.emailVerifiedAt || null,
    identityVerifiedAt: referee.kycStatus === 'APPROVED' ? new Date() : null,
    minimumDepositAt: (deposits._sum.amount || 0) >= MIN_DEPOSIT ? new Date() : null,
  }

  const qualified = Boolean(nextData.emailVerifiedAt && nextData.identityVerifiedAt && nextData.minimumDepositAt)
  if (!qualified) {
    return prisma.referral.update({ where: { id: referral.id }, data: { ...nextData, status: 'PENDING' } })
  }
  if (referral.status === 'QUALIFIED' && referral.qualifiedAt) return referral

  await prisma.$transaction(async (tx) => {
    await tx.referral.update({
      where: { id: referral.id },
      data: { ...nextData, status: 'QUALIFIED', qualifiedAt: new Date() },
    })

    const existingRewards = await tx.referralReward.findMany({ where: { referralId: referral.id, kind: { in: ['REFERRER_BONUS', 'REFEREE_BONUS'] } } })
    const hasReferrerBonus = existingRewards.some((r: any) => r.kind === 'REFERRER_BONUS')
    const hasRefereeBonus = existingRewards.some((r: any) => r.kind === 'REFEREE_BONUS')

    if (!hasReferrerBonus) {
      await creditReferralReward(tx, {
        userId: referral.referrerId,
        amount: 200,
        kind: 'REFERRER_BONUS',
        description: 'Qualified referral bonus credited.',
        referralId: referral.id,
      })
    }
    if (!hasRefereeBonus) {
      await creditReferralReward(tx, {
        userId: referral.refereeId,
        amount: 100,
        kind: 'REFEREE_BONUS',
        description: 'Welcome referral bonus credited.',
        referralId: referral.id,
      })
    }
  })

  await notifyUser(prisma, referral.referrerId, 'Referral qualified', 'Your friend completed verification and deposit. Your $200 referral bonus is now available.', '/wallet')
  await notifyUser(prisma, referral.refereeId, 'Referral reward credited', 'Welcome aboard. Your $100 referral reward has been credited.', '/wallet')
  await awardTierMilestones(referral.referrerId)
  await awardCampaigns(referral.referrerId)
  return prisma.referral.findUnique({ where: { id: referral.id } })
}

export async function awardTierMilestones(userId: string) {
  const qualifiedCount = await prisma.referral.count({ where: { referrerId: userId, status: 'QUALIFIED' } })
  for (const tier of TIER_MILESTONES) {
    if (qualifiedCount < tier.referrals) continue
    const existing = await prisma.referralReward.findFirst({ where: { userId, kind: 'TIER_BONUS', tierTarget: tier.referrals } })
    if (existing) continue
    await prisma.$transaction(async (tx) => {
      if (tier.bonus > 0) {
        await creditReferralReward(tx, {
          userId,
          amount: tier.bonus,
          kind: 'TIER_BONUS',
          description: `${tier.referrals} referral milestone bonus`,
          tierTarget: tier.referrals,
        })
      }
      if (tier.referrals === 50) {
        await tx.user.update({ where: { id: userId }, data: { vipInvestor: true } })
      }
    })
    await notifyUser(prisma, userId, 'New referral tier reached', `${tier.label}${tier.bonus > 0 ? ` — $${tier.bonus} credited.` : '.'}`, '/wallet')
  }
}

export async function awardCampaigns(userId: string) {
  const campaigns = await prisma.referralCampaign.findMany({ where: { isActive: true, startAt: { lte: new Date() }, endAt: { gte: new Date() } } })
  for (const campaign of campaigns) {
    const existing = await prisma.referralCampaignBonus.findUnique({ where: { campaignId_userId: { campaignId: campaign.id, userId } } })
    if (existing) continue
    const count = await prisma.referral.count({
      where: {
        referrerId: userId,
        status: 'QUALIFIED',
        qualifiedAt: { gte: campaign.startAt, lte: campaign.endAt },
      },
    })
    if (count < campaign.requiredQualifiedReferrals) continue
    await prisma.$transaction(async (tx) => {
      await tx.referralCampaignBonus.create({ data: { campaignId: campaign.id, userId } })
      await creditReferralReward(tx, {
        userId,
        amount: campaign.bonusAmount,
        kind: 'CAMPAIGN_BONUS',
        description: `${campaign.title} campaign bonus`,
        campaignId: campaign.id,
      })
    })
    await notifyUser(prisma, userId, 'Campaign bonus unlocked', `You completed ${campaign.title}. Your $${campaign.bonusAmount} bonus is now available.`, '/wallet')
  }
}

export async function distributeNetworkCommission(sourceUserId: string, depositTxId: string, amount: number) {
  let current = await prisma.user.findUnique({ where: { id: sourceUserId }, select: { referredById: true } })
  for (let level = 1; level <= LEVEL_RATES.length; level += 1) {
    const uplineId = current?.referredById
    if (!uplineId) break
    const existing = await prisma.referralReward.findFirst({ where: { userId: uplineId, kind: 'NETWORK_COMMISSION', sourceTxId: depositTxId, level } })
    if (!existing) {
      const rewardAmount = Number((amount * LEVEL_RATES[level - 1]).toFixed(2))
      await prisma.$transaction(async (tx) => {
        await creditReferralReward(tx, {
          userId: uplineId,
          amount: rewardAmount,
          kind: 'NETWORK_COMMISSION',
          description: `Level ${level} network commission from referral deposit`,
          level,
          sourceTxId: depositTxId,
        })
      })
      await notifyUser(prisma, uplineId, 'Network commission credited', `Your level ${level} referral network earned a new commission of $${rewardAmount}.`, '/wallet')
    }
    current = await prisma.user.findUnique({ where: { id: uplineId }, select: { referredById: true } })
  }
}

export function getMinReferralDeposit() {
  return MIN_DEPOSIT
}
