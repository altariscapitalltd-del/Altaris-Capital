import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { notifyUser } from '@/lib/push'
import { cookies } from 'next/headers'

// Profit starts 24 hours after investment creation
const PROFIT_DELAY_MS = 24 * 60 * 60 * 1000

function calcProfit(inv: {
  amount: number
  dailyRoi: number
  startDate: Date
  endDate: Date
  status: string
  totalEarned: number
}) {
  const now = Date.now()
  const startMs = new Date(inv.startDate).getTime()
  const endMs = new Date(inv.endDate).getTime()
  const profitStartMs = startMs + PROFIT_DELAY_MS
  const totalDurationDays = (endMs - startMs) / 86400000

  if (inv.status === 'COMPLETED') {
    return {
      profitEarned: parseFloat(inv.totalEarned.toFixed(2)),
      totalValue: parseFloat((inv.amount + inv.totalEarned).toFixed(2)),
      dailyProfit: parseFloat((inv.dailyRoi * inv.amount).toFixed(2)),
      hasStartedEarning: true,
      hoursUntilProfit: 0,
      daysRemaining: 0,
      progressPct: 100,
      totalDurationDays: parseFloat(totalDurationDays.toFixed(0)),
    }
  }

  const hasStartedEarning = now >= profitStartMs
  const msUntilProfit = Math.max(0, profitStartMs - now)
  const hoursUntilProfit = Math.ceil(msUntilProfit / 3600000)

  const earningMs = hasStartedEarning ? now - profitStartMs : 0
  const daysEarning = Math.min(earningMs / 86400000, totalDurationDays)
  const profitEarned = daysEarning * inv.dailyRoi * inv.amount

  const daysRemaining = Math.max(0, (endMs - now) / 86400000)
  const daysElapsed = Math.min((now - startMs) / 86400000, totalDurationDays)
  const progressPct = Math.min(100, (daysElapsed / totalDurationDays) * 100)

  return {
    profitEarned: parseFloat(profitEarned.toFixed(2)),
    totalValue: parseFloat((inv.amount + profitEarned).toFixed(2)),
    dailyProfit: parseFloat((inv.dailyRoi * inv.amount).toFixed(2)),
    hasStartedEarning,
    hoursUntilProfit,
    daysRemaining: parseFloat(daysRemaining.toFixed(1)),
    progressPct: parseFloat(progressPct.toFixed(1)),
    totalDurationDays: parseFloat(totalDurationDays.toFixed(0)),
  }
}

export async function GET() {
  const token = (await cookies()).get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = (await verifyToken(token)) as any
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const investments = await prisma.investment.findMany({
    where: { userId: payload.userId },
    orderBy: { startDate: 'desc' },
  })

  // Enrich each investment with live profit calculations
  const enriched = investments.map((inv) => ({
    ...inv,
    ...calcProfit(inv),
  }))

  // Summary aggregates
  const active = enriched.filter((i) => i.status === 'ACTIVE')
  const summary = {
    totalInvested: active.reduce((s, i) => s + i.amount, 0),
    totalProfit: active.reduce((s, i) => s + i.profitEarned, 0),
    totalValue: active.reduce((s, i) => s + i.totalValue, 0),
    dailyEarning: active.reduce((s, i) => s + i.dailyProfit, 0),
    activeCount: active.length,
  }

  return NextResponse.json({ investments: enriched, summary })
}

export async function POST(req: Request) {
  const token = (await cookies()).get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = (await verifyToken(token)) as any
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId, planName, amount, dailyRoi } = await req.json()
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  const balance = await prisma.balance.findFirst({ where: { userId: payload.userId, currency: 'USD' } })
  if (!balance || balance.amount < amount) return NextResponse.json({ error: 'Insufficient USD balance' }, { status: 400 })

  const DURATIONS: Record<string, number> = {
    'btc-yield': 14, 'eth-stake': 90, 'defi-accel': 7, 'altcoin': 30, 'btc-micro': 60, 'web3-venture': 20,
    'us-tech': 90, 'dividend': 180, 'sp500': 120, 'blue-chip': 90, 'ai-stocks': 60,
    'reit-us': 120, 'reit-asia': 90, 'dev-fund': 45, 'reit-global': 180,
    'us-treasury': 365, 'corp-bond': 180, 'hi-yield-bond': 120, 'em-bond': 150,
    'smart-save': 365, 'stablecoin': 60,
    'gold': 120, 'silver': 150, 'energy': 90,
    'usd-eur': 90, 'em-fx': 45, 'asia-fx': 60,
    'clean-energy': 90, 'health-etf': 120,
    'global-macro': 30, 'longshort': 30,
  }
  const durationDays = DURATIONS[planId] || 30

  const startDate = new Date()
  const endDate = new Date(startDate.getTime() + durationDays * 86400000)

  const [investment] = await prisma.$transaction([
    prisma.investment.create({
      data: {
        userId: payload.userId,
        planId: planId || 'custom',
        planName: planName || 'Investment Plan',
        amount,
        dailyRoi: dailyRoi || 0.01,
        startDate,
        endDate,
        status: 'ACTIVE',
      },
    }),
    prisma.balance.update({
      where: { id: balance.id },
      data: { amount: { decrement: amount } },
    }),
    prisma.transaction.create({
      data: {
        userId: payload.userId,
        type: 'INVESTMENT',
        currency: 'USD',
        amount,
        status: 'SUCCESS',
        note: `Invested in ${planName}`,
      },
    }),
    prisma.balanceSnapshot.create({
      data: { balanceId: balance.id, amount: balance.amount - amount },
    }),
  ])

  await notifyUser(
    prisma,
    payload.userId,
    'Investment Started',
    `Your $${amount.toLocaleString()} investment in ${planName || 'Investment Plan'} is now active. Profits begin after 24 hours.`,
    '/invest',
    'investment'
  )

  return NextResponse.json({ investment: { ...investment, ...calcProfit(investment) } })
}
