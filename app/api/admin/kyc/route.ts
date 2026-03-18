import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/push'
import { maybeQualifyReferral } from '@/lib/referrals'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'PENDING_REVIEW'
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

  const { submissionId, userId, action, reason, note } = await req.json()
  const targetSubmission = submissionId
    ? await prisma.kycSubmission.findUnique({ where: { id: submissionId } })
    : userId
      ? await prisma.kycSubmission.findUnique({ where: { userId } })
      : null
  if (!targetSubmission) return NextResponse.json({ error: 'KYC submission not found' }, { status: 404 })

  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'
  const rejectionReason = action === 'reject' ? reason || note || 'Please resubmit with a clearer document.' : null

  await prisma.$transaction([
    prisma.kycSubmission.update({ where: { id: targetSubmission.id }, data: { status: newStatus as any, rejectionReason, reviewedAt: new Date() } }),
    prisma.user.update({ where: { id: targetSubmission.userId }, data: { kycStatus: newStatus as any } }),
  ])

  if (action === 'approve') {
    await maybeQualifyReferral(targetSubmission.userId)
  }

  const msg = action === 'approve'
    ? 'Your identity has been verified. You can now make withdrawals and qualify referral rewards.'
    : `KYC rejected: ${rejectionReason}`
  await notifyUser(prisma, targetSubmission.userId, `KYC ${action === 'approve' ? 'Approved' : 'Rejected'}`, msg, '/kyc')
  await prisma.adminAuditLog.create({ data: { adminId: admin.id, action: `kyc_${action}`, targetUserId: targetSubmission.userId } })
  return NextResponse.json({ success: true })
}
