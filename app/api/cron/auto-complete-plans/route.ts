export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calcInvestmentState } from '@/lib/investmentMath'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // All ACTIVE plans whose endDate has passed
  const matured = await prisma.investment.findMany({
    where: { status: 'ACTIVE', endDate: { lte: new Date() } },
  })

  let completed = 0
  let skipped = 0

  for (const inv of matured) {
    try {
      const alreadyClaimed = await prisma.transaction.findFirst({
        where: { userId: inv.userId, note: `plan_claim:${inv.id}` },
      })
      if (alreadyClaimed) { skipped++; continue }

      const state = calcInvestmentState(inv)
      const totalValue = Math.round((inv.amount + state.profitEarned) * 1e8) / 1e8

      await prisma.$transaction([
        prisma.balance.upsert({
          where: { userId_currency: { userId: inv.userId, currency: 'USD' } },
          update: { amount: { increment: totalValue } },
          create: { userId: inv.userId, currency: 'USD', amount: totalValue },
        }),
        prisma.transaction.create({
          data: {
            userId: inv.userId,
            type: 'PROFIT' as any,
            amount: totalValue,
            currency: 'USD',
            status: 'SUCCESS' as any,
            note: `plan_claim:${inv.id}`,
          },
        }),
        prisma.investment.update({
          where: { id: inv.id },
          data: { status: 'COMPLETED' as any, totalEarned: state.profitEarned },
        }),
      ])

      try {
        const { notifyUser, notifyAdminTelegram } = await import('@/lib/push')
        await notifyUser(
          prisma, inv.userId,
          'Investment plan matured',
          `Your ${inv.planName} plan has ended. $${totalValue.toFixed(2)} (capital + profit) has been transferred to your wallet.`,
          '/invest?tab=my'
        )
        await notifyAdminTelegram(
          `💰 <b>Plan Auto-Completed</b>\nPlan: ${inv.planName}\nTotal: $${totalValue.toFixed(2)}\nProfit: $${state.profitEarned.toFixed(2)}`
        )
      } catch {}

      completed++
    } catch (e) {
      console.error('[auto-complete] plan', inv.id, e)
    }
  }

  return NextResponse.json({ checked: matured.length, completed, skipped })
}
