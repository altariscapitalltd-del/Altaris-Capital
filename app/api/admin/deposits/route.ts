import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/push'

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
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { txId, action, note } = await req.json()
  const tx = await prisma.transaction.findUnique({ where: { id: txId } })
  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  if (action === 'approve') {
    await prisma.$transaction([
      prisma.transaction.update({ where: { id: txId }, data: { status: 'SUCCESS', note: note || 'Admin approved' } }),
      prisma.balance.updateMany({
        where: { userId: tx.userId, currency: 'USD' },
        data: { amount: { increment: tx.amount } },
      }),
    ])

    // Save snapshot
    const bal = await prisma.balance.findFirst({ where: { userId: tx.userId, currency: 'USD' } })
    if (bal) {
      await prisma.balanceSnapshot.create({ data: { balanceId: bal.id, amount: bal.amount + tx.amount } })
    }

    await notifyUser(prisma, tx.userId, 'Deposit Confirmed', `Your deposit of $${tx.amount} has been confirmed and added to your account.`, '/wallet')
    await prisma.adminAuditLog.create({ data: { adminId: admin.id, action: 'approve_deposit', targetUserId: tx.userId, details: { txId } } })
  } else if (action === 'reject') {
    await prisma.transaction.update({ where: { id: txId }, data: { status: 'REJECTED', note: note || 'Admin rejected' } })
    await notifyUser(prisma, tx.userId, 'Deposit Rejected', `Your deposit of $${tx.amount} was rejected. ${note || ''}`, '/wallet')
    await prisma.adminAuditLog.create({ data: { adminId: admin.id, action: 'reject_deposit', targetUserId: tx.userId, details: { txId } } })
  }

  return NextResponse.json({ success: true })
}
