import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/push'
import { evaluateReferralQualification } from '@/lib/referrals'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'PENDING_REVIEW'
  const submissions = await prisma.kycSubmission.findMany({
    where: status !== 'ALL' ? { status: status as any } : {},
    include: { user: { select: { id: true, name: true, email: true, kycStatus: true } } },
    orderBy: { submittedAt: 'desc' },
  })
  return NextResponse.json({ submissions })
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, action, reason } = await req.json()
  if (!userId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 })
  }

  if (action === 'approve') {
    await prisma.$transaction([
      prisma.kycSubmission.update({ where: { userId }, data: { status: 'APPROVED', rejectionReason: null, reviewedAt: new Date() } }),
      prisma.user.update({ where: { id: userId }, data: { kycStatus: 'APPROVED' } }),
    ])
    try {
      await evaluateReferralQualification(prisma, userId)
    } catch (error) {
      console.warn('[admin/kyc] referral qualification skipped', error)
    }
    await notifyUser(prisma, userId, 'KYC Approved', 'Your identity has been verified. Your account is now fully verified.', '/kyc')
  } else {
    await prisma.$transaction([
      prisma.kycSubmission.update({ where: { userId }, data: { status: 'REJECTED', rejectionReason: reason || 'Please resubmit with a clearer document.', reviewedAt: new Date() } }),
      prisma.user.update({ where: { id: userId }, data: { kycStatus: 'REJECTED' } }),
    ])
    await notifyUser(prisma, userId, 'KYC Rejected', `Your verification was rejected. ${reason || 'Please resubmit with a clearer document.'}`, '/kyc')
  }

  await prisma.adminAuditLog.create({ data: { adminId: admin.id, action: `kyc_${action}`, targetUserId: userId, details: { reason: reason || null } } })
  return NextResponse.json({ success: true })
}
