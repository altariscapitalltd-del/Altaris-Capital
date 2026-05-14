import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/push'

export async function POST(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await req.json().catch(() => ({})) as Record<string, unknown>
  const target = String(payload.target || 'all')
  const title = String(payload.title || '').trim()
  const body = String((payload.body ?? payload.message ?? '')).trim()

  if (!title || !body) {
    return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
  }

  let recipients: string[] = []

  if (target === 'single') {
    const single = String(payload.userId || '').trim()
    const userIds = Array.isArray(payload.userIds) ? payload.userIds.map((id) => String(id)).filter(Boolean) : []
    recipients = single ? [single] : userIds
  } else if (target === 'multiple') {
    recipients = Array.isArray(payload.userIds) ? payload.userIds.map((id) => String(id)).filter(Boolean) : []
  } else if (target === 'kyc') {
    const users = await prisma.user.findMany({
      where: { kycStatus: 'APPROVED' },
      select: { id: true },
    })
    recipients = users.map((u: { id: string }) => u.id)
  } else {
    const users = await prisma.user.findMany({
      select: { id: true },
    })
    recipients = users.map((u: { id: string }) => u.id)
  }

  recipients = Array.from(new Set(recipients))

  await Promise.all(recipients.map((uid) => notifyUser(prisma, uid, title, body, String(payload.url || '/dashboard'))))

  await prisma.adminAuditLog.create({
    data: {
      adminId: admin.id,
      action: 'send_notification',
      details: { target, count: recipients.length, title },
    },
  })

  return NextResponse.json({ success: true, count: recipients.length, sent: recipients.length })
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
