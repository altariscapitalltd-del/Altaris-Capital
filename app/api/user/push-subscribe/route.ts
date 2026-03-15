import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subscription = await req.json()
  const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { pushSubscription: true } })
  const stored = existing?.pushSubscription && typeof existing.pushSubscription === 'object' ? (existing.pushSubscription as any) : {}
  const preferences = stored?.preferences || { pushAlerts: true, emailUpdates: true, investmentAlerts: true }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pushSubscription: {
        subscription,
        preferences,
      },
    },
  })

  return NextResponse.json({ success: true })
}
