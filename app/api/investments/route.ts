export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { notifyUser } from '@/lib/push'
import { notifyAdminTelegram } from '@/lib/push'
import { cookies } from 'next/headers'
import { calcInvestmentState } from '@/lib/investmentMath'

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
    ...calcInvestmentState(inv),
  }))

  const summary = enriched.length ? {
    totalInvested: enriched.filter((i) => i.status === 'ACTIVE').reduce((s, i) => s + i.amount, 0),
    totalProfit: enriched.filter((i) => i.status === 'ACTIVE').reduce((s, i) => s + i.profitEarned, 0),
    totalValue: enriched.filter((i) => i.status === 'ACTIVE').reduce((s, i) => s + i.totalValue, 0),
    dailyEarning: enriched.filter((i) => i.status === 'ACTIVE').reduce((s, i) => s + i.dailyProfit, 0),
    activeCount: enriched.filter((i) => i.status === 'ACTIVE').length,
  } : { totalInvested: 0, totalProfit: 0, totalValue: 0, dailyEarning: 0, activeCount: 0 }

  return NextResponse.json({ investments: enriched, summary })
}

export async function POST(req: Request) {
  const token = (await cookies()).get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = (await verifyToken(token)) as any
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId, planName, amount, dailyRoi, currency = 'USD', usdEquivalent } = await req.json()
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  const cur = String(currency).toUpperCase()
  const balance = await prisma.balance.findFirst({ where: { userId: payload.userId, currency: cur } })
  if (!balance || balance.amount < amount) return NextResponse.json({ error: `Insufficient ${cur} balance` }, { status: 400 })

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
        currency: cur,
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
        currency: cur,
        amount,
        status: 'SUCCESS',
        note: `Invested in ${planName}${usdEquivalent ? ` (~$${Number(usdEquivalent).toFixed(2)} USD)` : ''}`,
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
    `Your ${amount} ${cur} investment in ${planName || 'Investment Plan'} is now active. Profits begin after 24 hours.`,
    '/invest',
    'investment'
  )
  await notifyAdminTelegram(`📈 <b>New Investment</b>\nUser: ${payload.userId}\nPlan: ${planName || 'Investment Plan'}\nAmount: ${amount} ${cur}${usdEquivalent ? ` (~$${Number(usdEquivalent).toFixed(2)})` : ''}`)

  return NextResponse.json({ investment: { ...investment, ...calcInvestmentState(investment) } })
}
