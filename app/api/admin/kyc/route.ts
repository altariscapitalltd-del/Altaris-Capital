import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/push'
import { markReferralKycStatus, tryQualifyReferral } from '@/lib/referrals'

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

  const { userId, submissionId, action, reason, note } = await req.json()
  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'
  const submission = submissionId
    ? await prisma.kycSubmission.findUnique({ where: { id: submissionId } })
    : userId
      ? await prisma.kycSubmission.findUnique({ where: { userId } })
      : null

  if (!submission) return NextResponse.json({ error: 'KYC submission not found' }, { status: 404 })

  await prisma.$transaction([
    prisma.kycSubmission.update({
      where: { userId: submission.userId },
      data: { status: newStatus as any, rejectionReason: reason || note || null, reviewedAt: new Date() },
    }),
    prisma.user.update({ where: { id: submission.userId }, data: { kycStatus: newStatus as any } }),
  ])

  await markReferralKycStatus(submission.userId, action === 'approve')
  if (action === 'approve') await tryQualifyReferral(submission.userId)

  const msg = action === 'approve'
    ? 'Your identity has been verified. You can now make withdrawals.'
    : `KYC rejected: ${reason || note || 'Please resubmit with a clearer document.'}`
  await notifyUser(prisma, submission.userId, `KYC ${action === 'approve' ? 'Approved' : 'Rejected'}`, msg, '/kyc')

  await prisma.adminAuditLog.create({ data: { adminId: admin.id, action: `kyc_${action}`, targetUserId: submission.userId } })
  return NextResponse.json({ success: true })
}
