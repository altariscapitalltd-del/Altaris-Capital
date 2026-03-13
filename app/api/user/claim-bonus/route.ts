import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { notifyUser } from '@/lib/push'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check eligibility
  if (user.bonusClaimed) {
    return NextResponse.json({ error: 'Bonus already claimed' }, { status: 400 })
  }
  if (user.kycStatus !== 'APPROVED') {
    return NextResponse.json({ error: 'Complete KYC verification to claim your bonus' }, { status: 400 })
  }

  const BONUS_AMOUNT = 100

  // Credit balance + mark claimed in a transaction
  await db.$transaction([
    db.balance.update({
      where: { userId_currency: { userId: user.id, currency: 'USD' } },
      data: { amount: { increment: BONUS_AMOUNT } },
    }),
    db.transaction.create({
      data: {
        userId: user.id,
        type: 'BONUS',
        amount: BONUS_AMOUNT,
        currency: 'USD',
        status: 'SUCCESS',
        note: 'Welcome bonus — KYC verification reward',
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: { bonusClaimed: true },
    }),
  ])

  // Notify user
  await notifyUser(user.id, {
    title: '🎁 $100 Bonus Credited!',
    body: 'Your welcome bonus has been added to your account. Start investing today!',
    url: '/dashboard',
    type: 'bonus',
  })

  return NextResponse.json({ success: true, amount: BONUS_AMOUNT })
}
