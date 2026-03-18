import { PrismaClient, RewardEventType } from '@prisma/client'
import { notifyUser } from './push'

const DIRECT_REFERRER_BONUS = Number(process.env.REFERRAL_REFERRER_BONUS || 200)
const DIRECT_NEW_USER_BONUS = Number(process.env.REFERRAL_NEW_USER_BONUS || 100)
const MIN_QUALIFYING_DEPOSIT = Number(process.env.REFERRAL_MIN_DEPOSIT || 500)
const LEVEL_COMMISSIONS = [0.1, 0.05, 0.02]
const TIER_MILESTONES = [
  { referrals: 1, bonus: 100, title: 'Starter Referrer' },
  { referrals: 5, bonus: 700, title: 'Growth Referrer' },
  { referrals: 20, bonus: 3000, title: 'Elite Referrer' },
  { referrals: 50, bonus: 0, title: 'VIP Investor' },
] as const

function codeFragment(input: string) {
  return input.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'ALTARI'
}

export async function generateUniqueReferralCode(prisma: PrismaClient, seed: string) {
  const base = codeFragment(seed)
  for (let i = 0; i < 8; i += 1) {
    const candidate = `${base}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const exists = await prisma.user.findUnique({ where: { referralCode: candidate }, select: { id: true } })
    if (!exists) return candidate
  }
  return `${base}${Date.now().toString(36).toUpperCase().slice(-6)}`
}

async function creditReward(prisma: PrismaClient, userId: string, amount: number, type: RewardEventType, title: string, description: string, metadata?: any) {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { rewardBalance: { increment: amount }, rewardEarnings: { increment: amount } },
    })
    await tx.rewardEvent.create({ data: { userId, amount, type, title, description, metadata } })
    await tx.transaction.create({
      data: { userId, type: 'BONUS', amount, currency: 'USD', status: 'SUCCESS', note: title },
    })
  })
}

async function maybeAwardTierBonuses(prisma: PrismaClient, userId: string) {
  const qualifiedCount = await prisma.referral.count({ where: { referrerId: userId, status: 'QUALIFIED' } })
  for (const tier of TIER_MILESTONES) {
    if (qualifiedCount < tier.referrals) continue
    const existing = await prisma.rewardEvent.findFirst({
      where: { userId, type: tier.bonus > 0 ? 'REFERRAL_TIER' : 'VIP_UNLOCK', title: { contains: tier.title } },
      select: { id: true },
    })
    if (existing) continue

    if (tier.bonus > 0) {
      await creditReward(
        prisma,
        userId,
        tier.bonus,
        'REFERRAL_TIER',
        `${tier.title} tier unlocked`,
        `You reached ${tier.referrals} qualified referrals and unlocked a tier reward.`,
        { referrals: tier.referrals }
      )
      await notifyUser(prisma, userId, 'New referral tier unlocked', `Congratulations! You reached ${tier.referrals} qualified referrals and earned $${tier.bonus}.`, '/wallet')
    } else {
      await prisma.rewardEvent.create({
        data: {
          userId,
          amount: 0,
          type: 'VIP_UNLOCK',
          title: 'VIP Investor tier unlocked',
          description: 'VIP benefits unlocked: free stock reward, 90% cashback protection in your first month of a market dip, and exclusive investment benefits.',
          metadata: { referrals: tier.referrals, benefits: ['Free stock reward', '90% cashback protection', 'Exclusive investment benefits'] },
        },
      })
      await notifyUser(prisma, userId, 'VIP Investor unlocked', 'You unlocked VIP Investor benefits, including free stock rewards and exclusive investment perks.', '/wallet')
    }
  }
}

async function maybeAwardCampaigns(prisma: PrismaClient, userId: string) {
  const campaigns = await prisma.referralCampaign.findMany({
    where: { isActive: true, startAt: { lte: new Date() }, endAt: { gte: new Date() } },
  })
  if (!campaigns.length) return

  for (const campaign of campaigns) {
    const existing = await prisma.campaignReward.findUnique({ where: { campaignId_userId: { campaignId: campaign.id, userId } } })
    if (existing) continue
    const qualified = await prisma.referral.count({
      where: { referrerId: userId, status: 'QUALIFIED', qualifiedAt: { gte: campaign.startAt, lte: campaign.endAt } },
    })
    if (qualified < campaign.targetReferrals) continue

    await creditReward(prisma, userId, campaign.rewardAmount, 'CAMPAIGN_BONUS', `${campaign.name} completed`, campaign.description || `Campaign target reached: ${campaign.targetReferrals} qualified referrals.`, { campaignId: campaign.id })
    await prisma.campaignReward.create({ data: { campaignId: campaign.id, userId, qualifiedReferrals: qualified, amount: campaign.rewardAmount } })
    await notifyUser(prisma, userId, 'Campaign reward unlocked', `You completed ${campaign.name} and earned $${campaign.rewardAmount}.`, '/wallet')
  }
}

export async function evaluateReferralQualification(prisma: PrismaClient, referredUserId: string) {
  const referral = await prisma.referral.findUnique({
    where: { referredUserId },
    include: { referredUser: true, referrer: true },
  })
  if (!referral || referral.status !== 'PENDING') return referral

  const emailVerifiedAt = referral.referredUser.emailVerifiedAt || null
  const kycVerifiedAt = referral.referredUser.kycStatus === 'APPROVED' ? new Date() : null
  const qualifyingDeposit = await prisma.transaction.findFirst({
    where: { userId: referredUserId, type: 'DEPOSIT', status: 'SUCCESS', amount: { gte: MIN_QUALIFYING_DEPOSIT } },
    orderBy: { createdAt: 'asc' },
  })

  const nextReferral = await prisma.referral.update({
    where: { referredUserId },
    data: {
      emailVerifiedAt,
      kycVerifiedAt,
      depositQualifiedAt: qualifyingDeposit?.createdAt || null,
      qualificationDeposit: qualifyingDeposit?.amount || null,
      ...(emailVerifiedAt && kycVerifiedAt && qualifyingDeposit
        ? { status: 'QUALIFIED', qualifiedAt: new Date() }
        : {}),
    },
  })

  if (nextReferral.status !== 'QUALIFIED') return nextReferral

  const bonusAlreadyAwarded = await prisma.rewardEvent.findFirst({
    where: { userId: referral.referrerId, type: 'REFERRAL_BONUS', metadata: { path: ['referredUserId'], equals: referredUserId } as any },
  })
  if (!bonusAlreadyAwarded) {
    await creditReward(prisma, referral.referrerId, DIRECT_REFERRER_BONUS, 'REFERRAL_BONUS', 'Qualified referral bonus', `Your referral ${referral.referredUser.name} completed signup, verification, and minimum deposit.`, { referredUserId, role: 'referrer' })
    await creditReward(prisma, referredUserId, DIRECT_NEW_USER_BONUS, 'REFERRAL_BONUS', 'Welcome referral bonus', 'Your account qualified through a referral and unlocked a welcome bonus.', { referrerId: referral.referrerId, role: 'new_user' })
    await notifyUser(prisma, referral.referrerId, 'Referral bonus credited', `Your friend just invested. Your $${DIRECT_REFERRER_BONUS} referral bonus is now available.`, '/wallet')
    await notifyUser(prisma, referredUserId, 'Welcome bonus credited', `You earned $${DIRECT_NEW_USER_BONUS} after completing your account verification and first deposit.`, '/wallet')
  }

  await maybeAwardTierBonuses(prisma, referral.referrerId)
  await maybeAwardCampaigns(prisma, referral.referrerId)
  return nextReferral
}

export async function createDefaultCampaignIfMissing(prisma: PrismaClient) {
  const existing = await prisma.referralCampaign.findFirst({ where: { isActive: true } })
  if (existing) return existing
  const startAt = new Date()
  const endAt = new Date(startAt)
  endAt.setDate(endAt.getDate() + 30)
  return prisma.referralCampaign.create({
    data: {
      name: 'Refer 10 friends this month',
      description: 'Refer 10 qualified friends within the campaign period and earn a $1000 bonus.',
      targetReferrals: 10,
      rewardAmount: 1000,
      startAt,
      endAt,
      isActive: true,
    },
  })
}

export async function awardMultiLevelDepositCommissions(prisma: PrismaClient, userId: string, depositAmount: number) {
  let currentUserId: string | null = userId
  for (let level = 0; level < LEVEL_COMMISSIONS.length; level += 1) {
    const currentUser: { referredById: string | null; name: string | null } | null = await prisma.user.findUnique({ where: { id: currentUserId || '' }, select: { referredById: true, name: true } })
    const referrerId: string | null = currentUser?.referredById ?? null
    if (!referrerId) break
    const amount = Number((depositAmount * LEVEL_COMMISSIONS[level]).toFixed(2))
    if (amount <= 0) break
    await creditReward(prisma, referrerId, amount, 'REFERRAL_COMMISSION', `Level ${level + 1} network commission`, `You earned ${Math.round(LEVEL_COMMISSIONS[level] * 100)}% commission from your referral network deposit activity.`, { sourceUserId: userId, level: level + 1, depositAmount })
    await notifyUser(prisma, referrerId, 'Network commission credited', `A level ${level + 1} referral deposit earned you $${amount}.`, '/wallet')
    currentUserId = referrerId
  }
}

export const REFERRAL_CONFIG = {
  directBonuses: { referrer: DIRECT_REFERRER_BONUS, newUser: DIRECT_NEW_USER_BONUS },
  minDeposit: MIN_QUALIFYING_DEPOSIT,
  tierMilestones: TIER_MILESTONES,
}
