import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/push'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'PENDING_REVIEW'
  const submissions = await prisma.kycSubmission.findMany({
    where: status !== 'ALL' ? { status: status as any } : {},
    include: { user: { select: { name: true, email: true } } },
    orderBy: { submittedAt: 'desc' },
  })
  return NextResponse.json({ submissions })
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, action, reason } = await req.json()
  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

  await prisma.$transaction([
    prisma.kycSubmission.update({
      where: { userId },
      data: { status: newStatus as any, rejectionReason: reason || null, reviewedAt: new Date() },
    }),
    prisma.user.update({ where: { id: userId }, data: { kycStatus: newStatus as any } }),
  ])

  const msg = action === 'approve'
    ? 'Your identity has been verified. You can now make withdrawals.'
    : `KYC rejected: ${reason || 'Please resubmit with a clearer document.'}`
  await notifyUser(prisma, userId, `KYC ${action === 'approve' ? 'Approved' : 'Rejected'}`, msg, '/kyc')

  await prisma.adminAuditLog.create({ data: { adminId: admin.id, action: `kyc_${action}`, targetUserId: userId } })
  return NextResponse.json({ success: true })
}
