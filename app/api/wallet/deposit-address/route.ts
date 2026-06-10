import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getOrCreateDepositAddress } from '@/lib/depositAddress'
import { SUPPORTED_CHAIN_LABELS } from '@/lib/config/deposits'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const resolved = await getOrCreateDepositAddress(user.id)
    if (!resolved) {
      return NextResponse.json({ error: 'Deposit address unavailable' }, { status: 503 })
    }
    return NextResponse.json({
      address: resolved.address,
      shared: resolved.shared,
      asset: 'USDC',
      networks: SUPPORTED_CHAIN_LABELS,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to resolve deposit address' }, { status: 500 })
  }
}
