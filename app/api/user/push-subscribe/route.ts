import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/db'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'altaris-secret-change-this')

type Preferences = {
  pushAlerts: boolean
  emailUpdates: boolean
  investmentAlerts: boolean
  oneSignalPlayerId?: string | null
  oneSignalSubscriptionId?: string | null
}

const DEFAULT_PREFS: Preferences = {
  pushAlerts: false,
  emailUpdates: true,
  investmentAlerts: true,
  oneSignalPlayerId: null,
  oneSignalSubscriptionId: null,
}

async function getUserId(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return (payload.userId as string) || null
  } catch {
    return null
  }
}

function normalizePrefs(raw: unknown): Preferences {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    pushAlerts: typeof p.pushAlerts === 'boolean' ? p.pushAlerts : DEFAULT_PREFS.pushAlerts,
    emailUpdates: typeof p.emailUpdates === 'boolean' ? p.emailUpdates : DEFAULT_PREFS.emailUpdates,
    investmentAlerts: typeof p.investmentAlerts === 'boolean' ? p.investmentAlerts : DEFAULT_PREFS.investmentAlerts,
    oneSignalPlayerId: typeof p.oneSignalPlayerId === 'string' ? p.oneSignalPlayerId : null,
    oneSignalSubscriptionId: typeof p.oneSignalSubscriptionId === 'string' ? p.oneSignalSubscriptionId : null,
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushSubscription: true } })
  const preferences = normalizePrefs(user?.pushSubscription)
  return NextResponse.json({
    preferences,
    hasSubscription: Boolean(preferences.oneSignalSubscriptionId || preferences.oneSignalPlayerId),
    provider: 'onesignal',
  })
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushSubscription: true } })
  const current = normalizePrefs(user?.pushSubscription)

  const next: Preferences = {
    ...current,
    pushAlerts: true,
    oneSignalPlayerId: typeof body.oneSignalPlayerId === 'string' ? body.oneSignalPlayerId : current.oneSignalPlayerId,
    oneSignalSubscriptionId: typeof body.oneSignalSubscriptionId === 'string' ? body.oneSignalSubscriptionId : current.oneSignalSubscriptionId,
  }

  await prisma.user.update({ where: { id: userId }, data: { pushSubscription: next } })
  return NextResponse.json({ success: true, preferences: next, provider: 'onesignal' })
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushSubscription: true } })
  const current = normalizePrefs(user?.pushSubscription)

  const next: Preferences = {
    pushAlerts: typeof body.pushAlerts === 'boolean' ? body.pushAlerts : current.pushAlerts,
    emailUpdates: typeof body.emailUpdates === 'boolean' ? body.emailUpdates : current.emailUpdates,
    investmentAlerts: typeof body.investmentAlerts === 'boolean' ? body.investmentAlerts : current.investmentAlerts,
    oneSignalPlayerId: typeof body.oneSignalPlayerId === 'string' ? body.oneSignalPlayerId : current.oneSignalPlayerId,
    oneSignalSubscriptionId: typeof body.oneSignalSubscriptionId === 'string' ? body.oneSignalSubscriptionId : current.oneSignalSubscriptionId,
  }

  await prisma.user.update({ where: { id: userId }, data: { pushSubscription: next } })
  return NextResponse.json({ success: true, preferences: next, provider: 'onesignal' })
}
