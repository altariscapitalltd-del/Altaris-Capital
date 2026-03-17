import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/push'

const MIN_QUALIFY_DEPOSIT = Number(process.env.MIN_REFERRAL_DEPOSIT || 100)

const TIER_MILESTONES = [
  { referrals: 1, bonus: 100, label: 'Starter' },
  { referrals: 5, bonus: 700, label: 'Growth' },
  { referrals: 20, bonus: 3000, label: 'Pro' },
  { referrals: 50, bonus: 0, label: 'VIP Investor' },
]

function randomCode() {
  return `ALT${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export async function generateUniqueReferralCode() {
  for (let i = 0; i < 12; i++) {
    const code = randomCode()
    const exists = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true } })
    if (!exists) return code
  }
  return `ALT${Date.now().toString(36).toUpperCase().slice(-8)}`
}

async function creditReward(userId: string, amount: number, kind: string, note: string, referralId?: string | null, level?: number) {
  if (!amount || amount <= 0) return
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { rewardBalance: { increment: amount } } }),
    prisma.referralReward.create({ data: { userId, amount, kind, note, referralId: referralId || null, level: level || null } }),
  ])

  await notifyUser(prisma, userId, 'Referral reward credited', `$${amount.toFixed(2)} was added to your reward balance.`, '/wallet')
}

export async function attachReferralOnSignup(userId: string, referralCode?: string | null) {
  if (!referralCode) return
  const invited = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, phone: true } })
  if (!invited) return
  const referrer = await prisma.user.findUnique({ where: { referralCode }, select: { id: true, email: true, phone: true } })
  if (!referrer) return
  if (referrer.id === userId) return
  if (referrer.email.toLowerCase() === invited.email.toLowerCase()) return
  if (referrer.phone && invited.phone && referrer.phone === invited.phone) return

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { referredById: referrer.id } }),
    prisma.referral.upsert({
      where: { referredUserId: userId },
      update: { referrerId: referrer.id, signedUpAt: new Date() },
      create: { referrerId: referrer.id, referredUserId: userId },
    }),
  ])

  await notifyUser(prisma, referrer.id, 'New referral signup', 'A friend joined using your referral link. Help them complete KYC and first deposit to unlock rewards.', '/wallet')
}

export async function markReferralEmailVerified(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } })
  await prisma.referral.updateMany({ where: { referredUserId: userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } })
  await tryQualifyReferral(userId)
}

export async function markReferralKycVerified(userId: string) {
  await prisma.referral.updateMany({ where: { referredUserId: userId, kycVerifiedAt: null }, data: { kycVerifiedAt: new Date() } })
  await tryQualifyReferral(userId)
}

export async function handleQualifiedDeposit(userId: string, amount: number) {
  if (amount <= 0) return
  await prisma.referral.updateMany({
    where: { referredUserId: userId, minDepositAt: null },
    data: { minDepositAt: new Date(), firstDepositAmount: amount },
  })
  await tryQualifyReferral(userId)
  await distributeNetworkCommission(userId, amount)
}

async function distributeNetworkCommission(userId: string, amount: number) {
  const levelPercents = [0.1, 0.05, 0.02]
  let cursor = await prisma.user.findUnique({ where: { id: userId }, select: { referredById: true } })
  for (let i = 0; i < levelPercents.length; i++) {
    const uplineId = cursor?.referredById
    if (!uplineId) break
    const commission = Number((amount * levelPercents[i]).toFixed(2))
    await creditReward(uplineId, commission, 'NETWORK_COMMISSION', `Level ${i + 1} network commission from deposit`, null, i + 1)
    cursor = await prisma.user.findUnique({ where: { id: uplineId }, select: { referredById: true } })
  }
}

async function tryQualifyReferral(referredUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: referredUserId }, select: { emailVerified: true, kycStatus: true } })
  const referral = await prisma.referral.findUnique({ where: { referredUserId }, include: { referrer: { select: { id: true } } } })
  if (!user || !referral || referral.status === 'QUALIFIED') return

  const hasMinDeposit = !!referral.minDepositAt && referral.firstDepositAmount >= MIN_QUALIFY_DEPOSIT
  const hasKyc = user.kycStatus === 'APPROVED' || !!referral.kycVerifiedAt
  const hasEmail = user.emailVerified || !!referral.emailVerifiedAt
  if (!hasMinDeposit || !hasKyc || !hasEmail) return

  await prisma.referral.update({ where: { id: referral.id }, data: { status: 'QUALIFIED', qualifiedAt: new Date() } })

  await creditReward(referral.referrerId, 200, 'QUALIFIED_REFERRAL', 'Qualified referral bonus', referral.id, 1)
  await creditReward(referral.referredUserId, 100, 'WELCOME_REFERRAL', 'Welcome referral bonus', referral.id, 1)

  await notifyUser(prisma, referral.referrerId, 'Referral qualified', 'Your friend just invested. Your referral bonus is now available.', '/wallet')

  await evaluateTierBonuses(referral.referrerId)
  await evaluateCampaignBonuses(referral.referrerId)
}

async function evaluateTierBonuses(userId: string) {
  const qualified = await prisma.referral.count({ where: { referrerId: userId, status: 'QUALIFIED' } })
  for (const tier of TIER_MILESTONES) {
    if (qualified < tier.referrals) continue
    const existing = await prisma.referralReward.findFirst({ where: { userId, kind: `TIER_${tier.referrals}` }, select: { id: true } })
    if (existing) continue
    if (tier.bonus > 0) {
      await creditReward(userId, tier.bonus, `TIER_${tier.referrals}`, `Tier bonus unlocked: ${tier.referrals} referrals`)
    } else {
      await prisma.user.update({ where: { id: userId }, data: { vipInvestor: true } })
      await prisma.referralReward.create({ data: { userId, amount: 0, kind: 'VIP_UNLOCK', note: 'VIP Investor unlocked: free stock reward, 90% cashback protection, and exclusive investment benefits.' } })
      await notifyUser(prisma, userId, 'VIP Investor unlocked', 'You reached 50 referrals. VIP benefits are now active on your account.', '/wallet')
    }
  }
}

export async function ensureMonthlyCampaign() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59))
  const title = `Refer 10 friends this month and earn a $1000 bonus`

  const existing = await prisma.referralCampaign.findFirst({ where: { title, startAt: { gte: start }, endAt: { lte: end } } })
  if (existing) return existing
  return prisma.referralCampaign.create({
    data: {
      title,
      description: 'Limited-time growth campaign',
      targetQualified: 10,
      rewardAmount: 1000,
      startAt: start,
      endAt: end,
      active: true,
    },
  })
}

async function evaluateCampaignBonuses(userId: string) {
  await ensureMonthlyCampaign()
  const now = new Date()
  const campaigns = await prisma.referralCampaign.findMany({
    where: { active: true, startAt: { lte: now }, endAt: { gte: now } },
  })
  for (const campaign of campaigns) {
    const qualifiedInWindow = await prisma.referral.count({
      where: { referrerId: userId, status: 'QUALIFIED', qualifiedAt: { gte: campaign.startAt, lte: campaign.endAt } },
    })
    if (qualifiedInWindow < campaign.targetQualified) continue
    const exists = await prisma.referralCampaignReward.findUnique({ where: { campaignId_userId: { campaignId: campaign.id, userId } } })
    if (exists) continue

    await prisma.referralCampaignReward.create({ data: { campaignId: campaign.id, userId, amount: campaign.rewardAmount } })
    await creditReward(userId, campaign.rewardAmount, `CAMPAIGN_${campaign.id}`, campaign.title)
  }
}
