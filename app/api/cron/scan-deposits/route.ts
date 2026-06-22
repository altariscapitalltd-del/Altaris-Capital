export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { scanDeposits } from '@/lib/deposit-scan'

// Runs the on-chain deposit scanner. Authorize with either:
//   - Authorization: Bearer <CRON_SECRET>   (for Vercel Cron / external schedulers)
//   - a logged-in admin session              (manual "Scan now" button)
async function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization') || ''
  if (secret && auth === `Bearer ${secret}`) return true
  const admin = await getAdminUser(req)
  return !!admin
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await scanDeposits()
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: 'Scan failed', detail: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
