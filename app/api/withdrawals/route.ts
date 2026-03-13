import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const full = await prisma.user.findUnique({ where: { id: user.id } })
  if (!full?.withdrawEnabled) return NextResponse.json({ error: 'Withdrawals are disabled for your account.' }, { status: 403 })
  if (full.kycStatus !== 'APPROVED') return NextResponse.json({ error: 'KYC verification required before withdrawal.' }, { status: 403 })

  const { amount, currency, address } = await req.json()
  const balance = await prisma.balance.findFirst({ where: { userId: user.id, currency: 'USD' } })
  if (!balance || balance.amount < parseFloat(amount)) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  // Hold balance + create pending withdrawal
  await prisma.$transaction([
    prisma.balance.update({ where: { id: balance.id }, data: { amount: { decrement: parseFloat(amount) } } }),
    prisma.transaction.create({
      data: {
        userId: user.id, type: 'WITHDRAWAL',
        amount: parseFloat(amount), currency,
        status: 'PENDING',
        note: `Withdrawal to ${address}`,
      },
    }),
  ])

  const io = (global as any).io
  if (io) io.to('admin').emit('admin:new_withdrawal', { userId: user.id, amount, currency })

  return NextResponse.json({ success: true })
}
