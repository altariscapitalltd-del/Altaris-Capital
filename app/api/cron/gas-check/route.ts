import { NextRequest, NextResponse } from 'next/server'
import { checkAllRelayerBalances } from '@/lib/gasMonitor'

export const runtime    = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await checkAllRelayerBalances()
  const refillsTriggered = results.filter((r) => r.needsRefill).length

  return NextResponse.json({ ok: true, results, refillsTriggered })
}
