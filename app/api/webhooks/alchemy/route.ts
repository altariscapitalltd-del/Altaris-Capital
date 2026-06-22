export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { createHmac } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { scanUserByEvmAddress } from '@/lib/deposit-scan'

function verifySignature(rawBody: string, sig: string): boolean {
  const key = process.env.ALCHEMY_WEBHOOK_SIGNING_KEY
  if (!key) return true // allow through if key not yet configured
  const expected = createHmac('sha256', key).update(rawBody).digest('hex')
  return expected === sig
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('x-alchemy-signature') || ''

  if (!verifySignature(body, sig)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try { payload = JSON.parse(body) } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 })
  }

  const activities: any[] = payload?.event?.activity ?? []

  // Collect unique destination addresses that received value
  const toAddresses = new Set<string>()
  for (const a of activities) {
    if (a.toAddress && (a.value ?? 0) > 0) {
      toAddresses.add((a.toAddress as string).toLowerCase())
    }
  }

  // Run the balance-mirror scanner for each affected address.
  // This is idempotent — same logic as the cron, just targeted + immediate.
  let credited = 0
  for (const addr of Array.from(toAddresses)) {
    try { credited += await scanUserByEvmAddress(addr) } catch {}
  }

  return NextResponse.json({ ok: true, addresses: toAddresses.size, credited })
}
