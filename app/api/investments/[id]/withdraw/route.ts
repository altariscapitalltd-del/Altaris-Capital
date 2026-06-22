export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calcInvestmentState } from '@/lib/investmentMath'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = (await cookies()).get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = (await verifyToken(token)) as any
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const inv = await prisma.investment.findUnique({ where: { id: params.id } })
  if (!inv || inv.userId !== payload.userId) {
    return NextResponse.json({ error: 'Investment not found' }, { status: 404 })
  }

  // Allow withdrawal only when plan has matured (endDate passed) or is COMPLETED
  const matured = inv.status === 'COMPLETED' || new Date() >= new Date(inv.endDate)
  if (!matured) {
    return NextResponse.json({ error: 'Plan has not matured yet' }, { status: 400 })
  }

  // Prevent double-claiming: check if a withdrawal transaction for this investment already exists
  const alreadyClaimed = await prisma.transaction.findFirst({
    where: { userId: payload.userId, note: `plan_claim:${inv.id}` },
  })
  if (alreadyClaimed) {
    return NextResponse.json({ error: 'Funds already transferred to wallet' }, { status: 400 })
  }

  const state = calcInvestmentState(inv)
  const totalValue = Math.round((inv.amount + state.profitEarned) * 1e8) / 1e8
  const currency = (inv as any).currency || 'USD'

  await prisma.$transaction([
    // Credit balance in the currency used to invest
    prisma.balance.upsert({
      where: { userId_currency: { userId: payload.userId, currency } },
      update: { amount: { increment: totalValue } },
      create: { userId: payload.userId, currency, amount: totalValue },
    }),
    // Record the transfer as a transaction
    prisma.transaction.create({
      data: {
        userId: payload.userId,
        type: 'PROFIT',
        amount: totalValue,
        currency,
        status: 'SUCCESS',
        note: `plan_claim:${inv.id}`,
      },
    }),
    // Mark investment completed
    prisma.investment.update({
      where: { id: inv.id },
      data: { status: 'COMPLETED', totalEarned: state.profitEarned },
    }),
  ])

  return NextResponse.json({ ok: true, transferred: totalValue, currency })
}
