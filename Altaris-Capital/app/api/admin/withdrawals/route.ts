import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { trigger, userChannel } from '@/lib/pusher'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const withdrawals = await prisma.transaction.findMany({
    where: { type: 'WITHDRAWAL' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })

  return NextResponse.json({ withdrawals })
}

const actionSchema = z.object({
  txId: z.string(),
  action: z.enum(['APPROVE', 'REJECT']),
  note: z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { txId, action, note } = actionSchema.parse(body)

    const tx = await prisma.transaction.findUnique({
      where: { id: txId },
      include: { user: true }
    })

    if (!tx || tx.type !== 'WITHDRAWAL' || tx.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invalid transaction' }, { status: 400 })
    }

    if (action === 'APPROVE') {
      await prisma.transaction.update({
        where: { id: txId },
        data: { status: 'SUCCESS', note: note || tx.note }
      })
      
      await trigger(userChannel(tx.userId), 'notification:new', {
        title: 'Withdrawal Approved',
        body: `Your withdrawal of ${tx.amount} ${tx.currency} has been approved.`
      })
    } else {
      // REJECT: Refund the balance
      const balance = await prisma.balance.findFirst({
        where: { userId: tx.userId, currency: 'USD' } // Assuming withdrawals are from USD balance
      })

      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: txId },
          data: { status: 'REJECTED', note: note || 'Withdrawal rejected by admin' }
        }),
        prisma.balance.update({
          where: { id: balance!.id },
          data: { amount: { increment: tx.amount } }
        })
      ])

      await trigger(userChannel(tx.userId), 'notification:new', {
        title: 'Withdrawal Rejected',
        body: `Your withdrawal of ${tx.amount} ${tx.currency} was rejected. Funds have been returned to your balance.`
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Action failed' }, { status: 500 })
  }
}
