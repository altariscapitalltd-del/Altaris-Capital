import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/push'
import { trigger } from '@/lib/pusher'
import { findUserByDepositAddress } from '@/lib/depositAddress'
import {
  ALCHEMY_SIGNING_KEYS,
  USDC_CONTRACTS,
  ALCHEMY_NETWORK_TO_CHAIN,
} from '@/lib/config/deposits'

export const dynamic = 'force-dynamic'

// Alchemy Address Activity webhook. Credits incoming USDC transfers to the
// matching user's balance. Idempotent, signature-verified, multi-chain.
export async function POST(req: NextRequest) {
  // Raw body is required for HMAC verification — read before parsing.
  const raw = await req.text()
  const signature = req.headers.get('x-alchemy-signature') || ''

  if (ALCHEMY_SIGNING_KEYS.length === 0) {
    // Watcher not configured yet (scaffold mode) — refuse rather than credit blindly.
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }
  if (!verifySignature(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Bad payload' }, { status: 400 })
  }

  if (payload?.type !== 'ADDRESS_ACTIVITY') {
    return NextResponse.json({ ok: true, ignored: true })
  }

  const network: string = payload?.event?.network || ''
  const chain = ALCHEMY_NETWORK_TO_CHAIN[network]
  const activities: any[] = Array.isArray(payload?.event?.activity) ? payload.event.activity : []

  if (!chain) {
    return NextResponse.json({ ok: true, ignored: 'unsupported_network' })
  }
  const usdcContract = USDC_CONTRACTS[chain]

  let credited = 0
  for (let i = 0; i < activities.length; i++) {
    const act = activities[i]
    try {
      const handled = await processActivity(act, i, chain, network, usdcContract)
      if (handled) credited++
    } catch (err) {
      console.error('[alchemy-webhook] activity error', err)
      // Continue — one bad item must not drop the rest.
    }
  }

  return NextResponse.json({ ok: true, credited })
}

function verifySignature(body: string, signature: string): boolean {
  if (!signature) return false
  return ALCHEMY_SIGNING_KEYS.some((key) => {
    const digest = crypto.createHmac('sha256', key).update(body, 'utf8').digest('hex')
    // Constant-time compare; lengths must match or timingSafeEqual throws.
    const a = Buffer.from(digest)
    const b = Buffer.from(signature)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  })
}

async function processActivity(
  act: any,
  arrayIndex: number,
  chain: string,
  network: string,
  usdcContract: string,
): Promise<boolean> {
  const category = String(act?.category || '').toLowerCase()
  if (category !== 'token' && category !== 'erc20') return false

  const contract = String(act?.rawContract?.address || '').toLowerCase()
  if (!contract || contract !== usdcContract) return false

  const toAddress = String(act?.toAddress || '')
  if (!toAddress) return false

  const userId = await findUserByDepositAddress(toAddress)
  if (!userId) return false // not one of our addresses

  const amount = parseAmount(act)
  if (!(amount > 0)) return false

  const txHash = String(act?.hash || '')
  if (!txHash) return false
  const logIndex = resolveLogIndex(act, arrayIndex)

  // Idempotency guard + credit in a single transaction.
  try {
    await prisma.$transaction(async (tx: any) => {
      // Unique (txHash, logIndex, network) — throws P2002 if already processed.
      await tx.processedDeposit.create({
        data: { txHash, logIndex, network, userId, amount },
      })

      await tx.transaction.create({
        data: {
          userId,
          type: 'DEPOSIT',
          amount,
          currency: 'USDC',
          status: 'SUCCESS',
          txHash,
          note: `USDC deposit on ${chain} (auto-credited)`,
        },
      })

      // USDC is a dollar stablecoin → credit spendable USD balance 1:1.
      const balance = await tx.balance.upsert({
        where: { userId_currency: { userId, currency: 'USD' } },
        create: { userId, currency: 'USD', amount },
        update: { amount: { increment: amount } },
      })
      await tx.balanceSnapshot.create({ data: { balanceId: balance.id, amount: balance.amount } })
    })
  } catch (err: any) {
    if (err?.code === 'P2002') return false // already credited — safe to ignore
    throw err
  }

  // Side effects outside the DB transaction.
  await notifyUser(
    prisma,
    userId,
    'Deposit Received',
    `Your deposit of $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC has been credited to your balance.`,
    '/wallet',
  ).catch(() => {})
  await trigger(`private-user-${userId}`, 'balance:update', { amount }).catch(() => {})

  return true
}

// Prefer the human-readable `value`; fall back to rawValue / 10^decimals.
function parseAmount(act: any): number {
  if (typeof act?.value === 'number' && isFinite(act.value)) return act.value
  const rawValue = act?.rawContract?.rawValue
  const decimals = Number(act?.rawContract?.decimals)
  if (typeof rawValue === 'string' && Number.isFinite(decimals)) {
    try {
      const big = BigInt(rawValue)
      return Number(big) / 10 ** decimals
    } catch {
      return 0
    }
  }
  return 0
}

function resolveLogIndex(act: any, arrayIndex: number): number {
  const li = act?.log?.index ?? act?.log?.logIndex
  if (typeof li === 'number') return li
  if (typeof li === 'string') {
    const n = li.startsWith('0x') ? parseInt(li, 16) : parseInt(li, 10)
    if (Number.isFinite(n)) return n
  }
  return arrayIndex
}
