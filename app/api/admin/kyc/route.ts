import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/push'
import { refreshReferralProgress } from '@/lib/referrals'

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

  const body = await req.json()
  const userId = body.userId || (body.submissionId ? (await prisma.kycSubmission.findUnique({ where: { id: body.submissionId }, select: { userId: true } }))?.userId : null)
  const action = body.action as 'approve' | 'reject'
  const reason = body.reason || body.note || null
  if (!userId || !action) return NextResponse.json({ error: 'Invalid review request' }, { status: 400 })

  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'
  await prisma.$transaction([
    prisma.kycSubmission.update({ where: { userId }, data: { status: newStatus as any, rejectionReason: reason, reviewedAt: new Date() } }),
    prisma.user.update({ where: { id: userId }, data: { kycStatus: newStatus as any } }),
  ])

  if (action === 'approve') await refreshReferralProgress(userId)

  const msg = action === 'approve'
    ? 'Your identity verification has been approved. Your account is now verified.'
    : `KYC rejected: ${reason || 'Please resubmit with a clearer document.'}`
  await notifyUser(prisma, userId, `KYC ${action === 'approve' ? 'Approved' : 'Rejected'}`, msg, '/kyc')
  await prisma.adminAuditLog.create({ data: { adminId: admin.id, action: `kyc_${action}`, targetUserId: userId, details: { reason } } })
  return NextResponse.json({ success: true })
}
