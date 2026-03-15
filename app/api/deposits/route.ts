import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { trigger, adminChannel } from '@/lib/pusher'
import { z } from 'zod'

const depositSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0').max(1_000_000, 'Amount too large'),
  currency: z.string().trim().min(1).max(10).optional(),
  txHash: z.string().trim().min(3).max(200).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { amount, currency, txHash } = depositSchema.parse(await req.json())

    const tx = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'DEPOSIT',
        amount,
        currency: (currency || 'BTC').toUpperCase(),
        status: 'PENDING',
        txHash,
        note: 'Awaiting admin confirmation',
      },
    })

    await trigger(adminChannel, 'admin:new_deposit', { userId: user.id, amount, currency: currency || 'BTC', txId: tx.id })

    return NextResponse.json({ success: true, txId: tx.id })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to submit deposit' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const deposits = await prisma.transaction.findMany({
    where: { userId: user.id, type: 'DEPOSIT' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json({ deposits })
}
