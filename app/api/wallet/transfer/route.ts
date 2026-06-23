export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  recipientId: z.string().min(1),
  currency: z.string().min(1).max(10).transform(s => s.toUpperCase()),
  amount: z.coerce.number().positive().max(10_000_000),
  note: z.string().max(200).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const me = await getAuthUser(req)
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { recipientId, currency, amount, note } = schema.parse(await req.json())

    if (recipientId === me.id) {
      return NextResponse.json({ error: 'Cannot send to yourself' }, { status: 400 })
    }

    // Verify recipient exists and is active
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, name: true, isActive: true },
    })
    if (!recipient || !recipient.isActive) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    // Check sender has enough balance
    const senderBal = await prisma.balance.findUnique({
      where: { userId_currency: { userId: me.id, currency } },
    })
    if (!senderBal || senderBal.amount < amount) {
      return NextResponse.json({ error: `Insufficient ${currency} balance` }, { status: 400 })
    }

    const memo = note?.trim() || `Transfer to ${recipient.name}`

    await prisma.$transaction([
      // Debit sender
      prisma.balance.update({
        where: { userId_currency: { userId: me.id, currency } },
        data: { amount: { decrement: amount } },
      }),
      // Credit recipient (upsert in case they don't have this currency yet)
      prisma.balance.upsert({
        where: { userId_currency: { userId: recipientId, currency } },
        update: { amount: { increment: amount } },
        create: { userId: recipientId, currency, amount },
      }),
      // Sender's outgoing record
      prisma.transaction.create({
        data: {
          userId: me.id,
          type: 'TRANSFER_OUT' as any,
          amount,
          currency,
          status: 'SUCCESS' as any,
          note: memo,
        },
      }),
      // Recipient's incoming record
      prisma.transaction.create({
        data: {
          userId: recipientId,
          type: 'TRANSFER_IN' as any,
          amount,
          currency,
          status: 'SUCCESS' as any,
          note: `Received from ${me.name || 'Altaris user'}${note ? `: ${note}` : ''}`,
        },
      }),
    ])

    // Notify recipient
    try {
      const { notifyUser } = await import('@/lib/push')
      await notifyUser(
        prisma, recipientId,
        `${currency} received`,
        `${amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${currency} sent to you by ${me.name || 'another user'}.`,
        '/wallet'
      )
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues[0]?.message || 'Invalid input' }, { status: 400 })
    console.error('[transfer]', e)
    return NextResponse.json({ error: 'Transfer failed' }, { status: 500 })
  }
}
