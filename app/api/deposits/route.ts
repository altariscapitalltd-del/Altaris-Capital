import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { trigger, adminChannel } from '@/lib/pusher'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { amount, currency, txHash } = await req.json()

  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  const tx = await prisma.transaction.create({
    data: {
      userId: user.id,
      type: 'DEPOSIT',
      amount: parseFloat(amount),
      currency: currency || 'BTC',
      status: 'PENDING',
      txHash,
      note: 'Awaiting admin confirmation',
    },
  })

  // Notify admin
  await trigger(adminChannel, 'admin:new_deposit', { userId: user.id, amount, currency, txId: tx.id })

  return NextResponse.json({ success: true, txId: tx.id })
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
