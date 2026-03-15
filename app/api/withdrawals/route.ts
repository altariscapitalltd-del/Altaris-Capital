import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { trigger, adminChannel } from '@/lib/pusher'
import { z } from 'zod'

const withdrawSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0').max(1_000_000, 'Amount too large'),
  currency: z.string().trim().min(1).max(10),
  address: z.string().trim().min(6, 'Invalid wallet address').max(255, 'Wallet address too long'),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const full = await prisma.user.findUnique({ where: { id: user.id } })
    if (!full?.withdrawEnabled) return NextResponse.json({ error: 'Withdrawals are disabled for your account.' }, { status: 403 })
    if (full.kycStatus !== 'APPROVED') return NextResponse.json({ error: 'KYC verification required before withdrawal.' }, { status: 403 })

    const { amount, currency, address } = withdrawSchema.parse(await req.json())
    const balance = await prisma.balance.findFirst({ where: { userId: user.id, currency: 'USD' } })
    if (!balance || balance.amount < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.balance.update({ where: { id: balance.id }, data: { amount: { decrement: amount } } }),
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'WITHDRAWAL',
          amount,
          currency: currency.toUpperCase(),
          status: 'PENDING',
          note: `Withdrawal to ${address}`,
        },
      }),
    ])

    await trigger(adminChannel, 'admin:new_withdrawal', { userId: user.id, amount, currency: currency.toUpperCase() })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to submit withdrawal' }, { status: 500 })
  }
}
