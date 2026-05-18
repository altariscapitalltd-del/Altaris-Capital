import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAllRelayerBalances } from '@/lib/relayer'
import { GAS_CONFIG } from '@/lib/gasConfig'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await verifyToken(token, true).catch(() => null)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const balances = await getAllRelayerBalances()
  const recentRefills = await prisma.airdropGasRefill.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const enriched = balances.map((b) => ({
    ...b,
    status: b.chainId === GAS_CONFIG.sourceChainId
      ? 'source'
      : b.wei < GAS_CONFIG.minBalance
      ? 'low'
      : 'ok',
    threshold: GAS_CONFIG.minBalance.toString(),
  }))

  return NextResponse.json({
    relayerAddress: process.env.RELAYER_ADDRESS,
    balances:       enriched,
    recentRefills,
  })
}
