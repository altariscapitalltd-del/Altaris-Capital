export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  from: z.string().min(1).max(10).transform(s => s.toUpperCase()),
  to:   z.string().min(1).max(10).transform(s => s.toUpperCase()),
  fromAmount: z.coerce.number().positive().max(10_000_000),
})

const FEE = 0.005  // 0.5% platform swap fee

async function getLivePrice(sym: string): Promise<number | null> {
  if (sym === 'USD' || sym === 'USDT' || sym === 'USDC') return 1
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(sym.toLowerCase())}&vs_currencies=usd`,
      { next: { revalidate: 60 } }
    )
    const d = await res.json()
    // Try by symbol name directly, fall back to common map
    const COIN_IDS: Record<string, string> = {
      BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana',
      XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', MATIC: 'matic-network',
      AVAX: 'avalanche-2', LINK: 'chainlink', UNI: 'uniswap', AAVE: 'aave',
      SHIB: 'shiba-inu', PEPE: 'pepe', ARB: 'arbitrum', OP: 'optimism',
      TRX: 'tron', LTC: 'litecoin', DOT: 'polkadot', ATOM: 'cosmos',
      NEAR: 'near', FTM: 'fantom', CAKE: 'pancakeswap-token',
    }
    const id = COIN_IDS[sym] || sym.toLowerCase()
    return d[id]?.usd ?? null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getAuthUser(req)
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { from, to, fromAmount } = schema.parse(await req.json())

    if (from === to) return NextResponse.json({ error: 'Cannot swap a currency with itself' }, { status: 400 })

    // Check sender balance
    const fromBal = await prisma.balance.findUnique({
      where: { userId_currency: { userId: me.id, currency: from } },
    })
    if (!fromBal || fromBal.amount < fromAmount) {
      return NextResponse.json({ error: `Insufficient ${from} balance` }, { status: 400 })
    }

    // Get live prices
    const [fromPrice, toPrice] = await Promise.all([getLivePrice(from), getLivePrice(to)])
    if (!fromPrice || !toPrice) {
      return NextResponse.json({ error: 'Price unavailable for one or both currencies' }, { status: 400 })
    }

    // toAmount = fromAmount × (fromPrice / toPrice) × (1 - fee)
    const toAmount = fromAmount * (fromPrice / toPrice) * (1 - FEE)
    const toAmountRounded = Math.round(toAmount * 1e8) / 1e8
    const feeUsd = fromAmount * fromPrice * FEE

    await prisma.$transaction([
      prisma.balance.update({
        where: { userId_currency: { userId: me.id, currency: from } },
        data: { amount: { decrement: fromAmount } },
      }),
      prisma.balance.upsert({
        where: { userId_currency: { userId: me.id, currency: to } },
        update: { amount: { increment: toAmountRounded } },
        create: { userId: me.id, currency: to, amount: toAmountRounded },
      }),
      prisma.transaction.create({
        data: {
          userId: me.id,
          type: 'SWAP' as any,
          amount: fromAmount,
          currency: from,
          status: 'SUCCESS' as any,
          note: `Swapped ${fromAmount} ${from} → ${toAmountRounded} ${to}`,
        },
      }),
      prisma.transaction.create({
        data: {
          userId: me.id,
          type: 'SWAP' as any,
          amount: toAmountRounded,
          currency: to,
          status: 'SUCCESS' as any,
          note: `Received ${toAmountRounded} ${to} from swap`,
        },
      }),
    ])

    return NextResponse.json({ ok: true, received: toAmountRounded, feeUsd: Math.round(feeUsd * 100) / 100, rate: fromPrice / toPrice })
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues[0]?.message || 'Invalid input' }, { status: 400 })
    console.error('[swap]', e)
    return NextResponse.json({ error: 'Swap failed' }, { status: 500 })
  }
}
