import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
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

  const BONUS_AMOUNT = 40

  // Credit balance + mark claimed in a transaction
  await prisma.$transaction([
    prisma.balance.update({
      where: { userId_currency: { userId: user.id, currency: 'USD' } },
      data: { amount: { increment: BONUS_AMOUNT } },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'BONUS',
        amount: BONUS_AMOUNT,
        currency: 'USD',
        status: 'SUCCESS',
        note: 'Welcome bonus — KYC verification reward',
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { bonusClaimed: true },
    }),
  ])

  // Notify user
  await notifyUser(prisma, user.id, ' $40 Bonus Credited!', 'Your welcome bonus has been added to your account. Start investing today!', '/dashboard')

  return NextResponse.json({ success: true, amount: BONUS_AMOUNT })
}
