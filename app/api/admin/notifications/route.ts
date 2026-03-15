import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/push'

export async function POST(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { target, userIds, title, body, url, kycOnly } = await req.json()

  let recipients: string[] = []

  if (target === 'single' && userIds?.length) {
    recipients = userIds
  } else if (target === 'multiple' && userIds?.length) {
    recipients = userIds
  } else if (target === 'all') {
    const users = await prisma.user.findMany({
      where: kycOnly ? { kycStatus: 'APPROVED' } : {},
      select: { id: true },
    })
    recipients = users.map((u: { id: string }) => u.id)
  }

  await Promise.all(recipients.map((uid: string) => notifyUser(prisma, uid, title, body, url || '/dashboard')))

  await prisma.adminAuditLog.create({
    data: { adminId: admin.id, action: 'send_notification', details: { target, count: recipients.length, title } },
  })

  return NextResponse.json({ success: true, sent: recipients.length })
}

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const logs = await prisma.adminAuditLog.findMany({
    where: { action: 'send_notification' },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json({ logs })
}
