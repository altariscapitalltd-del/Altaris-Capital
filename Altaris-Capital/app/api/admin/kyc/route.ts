import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/push'
import { sendKycStatusEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'ALL'
  const submissions = await prisma.kycSubmission.findMany({
    where: status !== 'ALL' ? { status: status as any } : {},
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { submittedAt: 'desc' },
  })
  return NextResponse.json({ submissions })
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { userId, action, reason } = await req.json()
    if (!userId || !action) return NextResponse.json({ error: 'userId and action are required' }, { status: 400 })

    const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

    const [submission] = await prisma.$transaction([
      prisma.kycSubmission.update({
        where: { userId },
        data: { status: newStatus as any, rejectionReason: reason || null, reviewedAt: new Date() },
        include: { user: { select: { email: true, name: true } } },
      }),
      prisma.user.update({ where: { id: userId }, data: { kycStatus: newStatus as any } }),
    ])

    const title = action === 'approve' ? 'KYC Approved ✓' : 'KYC Rejected'
    const msg = action === 'approve'
      ? 'Your identity has been verified. You can now make withdrawals and access all features.'
      : `Your KYC was not approved. Reason: ${reason || 'Please resubmit with a clearer document.'}`

    await notifyUser(prisma, userId, title, msg, '/kyc')

    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
      if (user?.email) {
        await sendKycStatusEmail(user.email, user.name, action === 'approve' ? 'approved' : 'rejected', reason)
      }
    } catch (emailErr) {
      console.error('[Admin KYC] email send failed:', emailErr)
    }

    if (action === 'approve') {
      try {
        const referral = await prisma.referral.findUnique({ where: { referredId: userId } })
        if (referral && !referral.kycApproved) {
          await prisma.referral.update({ where: { referredId: userId }, data: { kycApproved: true } })
          await checkAndQualifyReferral(referral.id)
        }
      } catch {}
    }

    await prisma.adminAuditLog.create({ data: { adminId: admin.id, action: `kyc_${action}`, targetUserId: userId } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[Admin KYC PATCH]', e?.message)
    return NextResponse.json({ error: e?.message || 'Failed to update KYC' }, { status: 500 })
  }
}

async function checkAndQualifyReferral(referralId: string) {
  const referral = await prisma.referral.findUnique({ where: { id: referralId } })
  if (!referral || referral.status !== 'PENDING') return
  if (referral.emailVerified && referral.kycApproved && referral.depositMade) {
    await prisma.referral.update({ where: { id: referralId }, data: { status: 'QUALIFIED', qualifiedAt: new Date() } })

    const REFERRER_BONUS = 200
    const REFERRED_BONUS = 100

    await prisma.$transaction([
      prisma.user.update({ where: { id: referral.referrerId }, data: { referralRewardBalance: { increment: REFERRER_BONUS } } }),
      prisma.user.update({ where: { id: referral.referredId }, data: { referralRewardBalance: { increment: REFERRED_BONUS } } }),
      prisma.referralReward.create({ data: { userId: referral.referrerId, amount: REFERRER_BONUS, reason: 'Referral qualified', referralId } }),
      prisma.referralReward.create({ data: { userId: referral.referredId, amount: REFERRED_BONUS, reason: 'Welcome referral bonus', referralId } }),
    ])

    await notifyUser(prisma, referral.referrerId, 'Referral Qualified! 🎉', `Your referral is complete. $${REFERRER_BONUS} bonus added to your rewards balance.`, '/rewards')
    await notifyUser(prisma, referral.referredId, 'Welcome Bonus! 🎁', `You received a $${REFERRED_BONUS} bonus for joining via referral.`, '/rewards')
  }
}
