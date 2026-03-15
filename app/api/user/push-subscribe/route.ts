import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'altaris-secret-change-this')

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

function readPrefsCookie(req: NextRequest): Preferences {
  const raw = req.cookies.get('notif_prefs')?.value
  if (!raw) return DEFAULT_PREFS
  try {
    const parsed = JSON.parse(raw)
    return {
      pushAlerts: typeof parsed.pushAlerts === 'boolean' ? parsed.pushAlerts : DEFAULT_PREFS.pushAlerts,
      emailUpdates: typeof parsed.emailUpdates === 'boolean' ? parsed.emailUpdates : DEFAULT_PREFS.emailUpdates,
      investmentAlerts: typeof parsed.investmentAlerts === 'boolean' ? parsed.investmentAlerts : DEFAULT_PREFS.investmentAlerts,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

function withPrefsCookie(res: NextResponse, prefs: Preferences) {
  res.cookies.set('notif_prefs', JSON.stringify(prefs), {
    httpOnly: false,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ preferences: readPrefsCookie(req), hasSubscription: false, degraded: true })
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await req.json().catch(() => null)
  const next = { ...readPrefsCookie(req), pushAlerts: true }
  const res = NextResponse.json({ success: true, preferences: next, degraded: true })
  withPrefsCookie(res, next)
  return res
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const current = readPrefsCookie(req)
  const next: Preferences = {
    pushAlerts: typeof body.pushAlerts === 'boolean' ? body.pushAlerts : current.pushAlerts,
    emailUpdates: typeof body.emailUpdates === 'boolean' ? body.emailUpdates : current.emailUpdates,
    investmentAlerts: typeof body.investmentAlerts === 'boolean' ? body.investmentAlerts : current.investmentAlerts,
  }
  const res = NextResponse.json({ success: true, preferences: next, degraded: true })
  withPrefsCookie(res, next)
  return res
}
