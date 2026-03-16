import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/db'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'altaris-secret-change-this')

type Preferences = {
  pushAlerts: boolean
  emailUpdates: boolean
  investmentAlerts: boolean
}

type StoredSubscription = Preferences & {
  token?: string | null
}

const DEFAULT_PREFS: Preferences = {
  pushAlerts: false,
  emailUpdates: true,
  investmentAlerts: true,
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

function normalizeStored(raw: unknown): StoredSubscription {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    pushAlerts: typeof p.pushAlerts === 'boolean' ? p.pushAlerts : DEFAULT_PREFS.pushAlerts,
    emailUpdates: typeof p.emailUpdates === 'boolean' ? p.emailUpdates : DEFAULT_PREFS.emailUpdates,
    investmentAlerts: typeof p.investmentAlerts === 'boolean' ? p.investmentAlerts : DEFAULT_PREFS.investmentAlerts,
    token: typeof p.token === 'string' ? p.token : null,
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushSubscription: true } })
  const stored = normalizeStored(user?.pushSubscription)
  const { token, ...preferences } = stored
  return NextResponse.json({
    preferences,
    hasSubscription: !!token,
    provider: 'fcm',
  })
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const token = typeof body.token === 'string' ? body.token : null

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushSubscription: true } })
  const current = normalizeStored(user?.pushSubscription)
  const next: StoredSubscription = { ...current, pushAlerts: true, token }

  await prisma.user.update({ where: { id: userId }, data: { pushSubscription: next } })
  const { token: _, ...preferences } = next
  return NextResponse.json({ success: true, preferences, provider: 'fcm' })
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushSubscription: true } })
  const current = normalizeStored(user?.pushSubscription)

  const next: StoredSubscription = {
    pushAlerts: typeof body.pushAlerts === 'boolean' ? body.pushAlerts : current.pushAlerts,
    emailUpdates: typeof body.emailUpdates === 'boolean' ? body.emailUpdates : current.emailUpdates,
    investmentAlerts: typeof body.investmentAlerts === 'boolean' ? body.investmentAlerts : current.investmentAlerts,
    token: typeof body.token === 'string' ? body.token : current.token,
  }

  await prisma.user.update({ where: { id: userId }, data: { pushSubscription: next } })
  const { token: _, ...preferences } = next
  return NextResponse.json({ success: true, preferences, provider: 'fcm' })
}
