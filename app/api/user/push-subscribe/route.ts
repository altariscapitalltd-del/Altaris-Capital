import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

type Preferences = {
  pushAlerts: boolean
  emailUpdates: boolean
  investmentAlerts: boolean
}

const DEFAULT_PREFS: Preferences = {
  pushAlerts: false,
  emailUpdates: true,
  investmentAlerts: true,
}

function extractPrefs(raw: any): Preferences {
  const p = raw?.preferences || raw || {}
  return {
    pushAlerts: typeof p.pushAlerts === 'boolean' ? p.pushAlerts : DEFAULT_PREFS.pushAlerts,
    emailUpdates: typeof p.emailUpdates === 'boolean' ? p.emailUpdates : DEFAULT_PREFS.emailUpdates,
    investmentAlerts: typeof p.investmentAlerts === 'boolean' ? p.investmentAlerts : DEFAULT_PREFS.investmentAlerts,
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const target = await prisma.user.findUnique({ where: { id: user.id }, select: { pushSubscription: true } })
  const prefs = extractPrefs(target?.pushSubscription)

  return NextResponse.json({
    preferences: prefs,
    hasSubscription: Boolean((target?.pushSubscription as any)?.subscription),
  })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subscription = await req.json().catch(() => null)
  const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { pushSubscription: true } })
  const prefs = { ...extractPrefs(existing?.pushSubscription), pushAlerts: true }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pushSubscription: {
        subscription,
        preferences: prefs,
      },
    },
  })

  return NextResponse.json({ success: true, preferences: prefs })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { pushSubscription: true } })
  const current = extractPrefs(existing?.pushSubscription)

  const next: Preferences = {
    pushAlerts: typeof body.pushAlerts === 'boolean' ? body.pushAlerts : current.pushAlerts,
    emailUpdates: typeof body.emailUpdates === 'boolean' ? body.emailUpdates : current.emailUpdates,
    investmentAlerts: typeof body.investmentAlerts === 'boolean' ? body.investmentAlerts : current.investmentAlerts,
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pushSubscription: {
        ...(existing?.pushSubscription as object || {}),
        preferences: next,
      },
    },
  })

  return NextResponse.json({ success: true, preferences: next })
}
