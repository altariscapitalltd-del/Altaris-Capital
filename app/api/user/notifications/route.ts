import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const unreadCount = notifications.filter((n: { read: boolean }) => !n.read).length

  return NextResponse.json({ notifications, unreadCount })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { ids, markAll } = body as { ids?: string[]; markAll?: boolean }

  if (!markAll && (!ids || !Array.isArray(ids) || ids.length === 0)) {
    return NextResponse.json({ error: 'No notification IDs provided' }, { status: 400 })
  }

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      ...(markAll ? {} : { id: { in: ids } }),
    },
    data: { read: true },
  })

  return NextResponse.json({ success: true })
}
