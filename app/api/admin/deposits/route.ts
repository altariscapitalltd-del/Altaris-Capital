import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/push'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const patchSchema = z.object({
  txId: z.string().min(1, 'Transaction ID is required'),
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).optional(),
})

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deposits = await prisma.transaction.findMany({
    where: { type: 'DEPOSIT' },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ deposits })
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getAdminUser(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { txId, action, note } = patchSchema.parse(await req.json())
    const tx = await prisma.transaction.findUnique({ where: { id: txId } })
    if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    if (tx.type !== 'DEPOSIT') return NextResponse.json({ error: 'Transaction is not a deposit' }, { status: 400 })
    if (tx.status !== 'PENDING') {
      return NextResponse.json({ error: `Transaction already ${tx.status.toLowerCase()}` }, { status: 409 })
    }

    if (action === 'approve') {
      await prisma.$transaction(async (txClient: Prisma.TransactionClient) => {
        const updatedTx = await txClient.transaction.updateMany({
          where: { id: txId, status: 'PENDING' },
          data: { status: 'SUCCESS', note: note || 'Admin approved' },
        })
        if (updatedTx.count === 0) {
          throw new Error('Transaction already processed')
        }

        const balance = await txClient.balance.findFirst({ where: { userId: tx.userId, currency: 'USD' } })
        if (!balance) {
          throw new Error('USD balance not found for user')
        }

        const updatedBalance = await txClient.balance.update({
          where: { id: balance.id },
          data: { amount: { increment: tx.amount } },
        })

        await txClient.balanceSnapshot.create({ data: { balanceId: balance.id, amount: updatedBalance.amount } })
        await txClient.adminAuditLog.create({
          data: { adminId: admin.id, action: 'approve_deposit', targetUserId: tx.userId, details: { txId } },
        })
      })

      await notifyUser(prisma, tx.userId, 'Deposit Confirmed', `Your deposit of $${tx.amount} has been confirmed and added to your account.`, '/wallet')
      return NextResponse.json({ success: true })
    }

    const rejected = await prisma.transaction.updateMany({
      where: { id: txId, status: 'PENDING' },
      data: { status: 'REJECTED', note: note || 'Admin rejected' },
    })
    if (rejected.count === 0) {
      return NextResponse.json({ error: 'Transaction already processed' }, { status: 409 })
    }
    await notifyUser(prisma, tx.userId, 'Deposit Rejected', `Your deposit of $${tx.amount} was rejected. ${note || ''}`, '/wallet')
    await prisma.adminAuditLog.create({ data: { adminId: admin.id, action: 'reject_deposit', targetUserId: tx.userId, details: { txId } } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid request body' }, { status: 400 })
    }
    if (error?.message === 'Transaction already processed') {
      return NextResponse.json({ error: 'Transaction already processed' }, { status: 409 })
    }
    if (error?.message === 'USD balance not found for user') {
      return NextResponse.json({ error: 'User USD balance not found' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update deposit transaction' }, { status: 500 })
  }
}
