import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

const defaultPrefs = { pushAlerts: true, emailUpdates: true, investmentAlerts: true }

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const full = await prisma.user.findUnique({ where: { id: user.id }, select: { pushSubscription: true } })
  const stored = full?.pushSubscription && typeof full.pushSubscription === 'object' ? (full.pushSubscription as any) : {}
  const preferences = { ...defaultPrefs, ...(stored.preferences || {}) }

  return NextResponse.json({ preferences })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const next = {
    pushAlerts: Boolean(body.pushAlerts),
    emailUpdates: Boolean(body.emailUpdates),
    investmentAlerts: Boolean(body.investmentAlerts),
  }

  const full = await prisma.user.findUnique({ where: { id: user.id }, select: { pushSubscription: true } })
  const stored = full?.pushSubscription && typeof full.pushSubscription === 'object' ? (full.pushSubscription as any) : {}

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pushSubscription: {
        ...(stored.subscription ? { subscription: stored.subscription } : {}),
        preferences: next,
      },
    },
  })

  return NextResponse.json({ success: true, preferences: next })
}
