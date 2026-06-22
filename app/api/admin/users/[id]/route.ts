export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { trigger, userChannel } from '@/lib/pusher'
import { notifyAdminTelegram } from '@/lib/push'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      balances: true,
      transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      investments: { orderBy: { startDate: 'desc' }, take: 20 },
      kyc: true,
      conversation: { include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } } },
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ user })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, ...data } = body

  let logAction = action
  let updateData: any = {}

  switch (action) {
    case 'adjust_balance': {
      const currency = (data.currency || 'USD').toString().toUpperCase()
      const delta = Number(data.amount ?? data.delta ?? 0)
      const template = String(data.template || 'ADJUSTMENT').toUpperCase()
      if (!Number.isFinite(delta) || delta === 0) return NextResponse.json({ error: 'Adjustment amount must be non-zero' }, { status: 400 })

      const balance = await prisma.balance.findFirst({ where: { userId: params.id, currency } })
      let currentAmount = balance ? balance.amount : 0
      const newAmount = Math.max(0, currentAmount + delta)

      const txType = template === 'DEPOSIT' ? 'DEPOSIT' : template === 'WITHDRAWAL' ? 'WITHDRAWAL' : 'ADJUSTMENT'
      const defaultNote = txType === 'DEPOSIT'
        ? 'Deposit approved by admin'
        : txType === 'WITHDRAWAL'
          ? 'Withdrawal processed by admin'
          : 'Admin adjustment'

      const operations: any[] = [
        balance
          ? prisma.balance.update({ where: { id: balance.id }, data: { amount: newAmount } })
          : prisma.balance.create({ data: { userId: params.id, currency, amount: newAmount } }),
      ]

      // Plain admin adjustments are internal balance corrections and should not
      // appear in the user's transaction history. Template actions still do.
      if (txType !== 'ADJUSTMENT') {
        operations.push(prisma.transaction.create({
          data: {
            userId: params.id,
            type: txType as any,
            amount: Math.abs(delta),
            currency,
            status: 'SUCCESS',
            note: (data.note || defaultNote).toString().slice(0, 500),
          },
        }))
      }

      await prisma.$transaction(operations)
      await notifyAdminTelegram(`🧮 <b>Balance Adjusted</b>\nUser: ${params.id}\nDelta: ${delta} ${currency}\nAction: ${txType}`)
      break
    }
    case 'freeze':
    case 'toggle_freeze': {
      const user = await prisma.user.findUnique({ where: { id: params.id }, select: { isActive: true } })
      updateData = { isActive: !user?.isActive }
      await notifyAdminTelegram(`⛔ <b>Account Freeze Toggled</b>\nUser: ${params.id}`)
      break
    }
    case 'unfreeze':     updateData = { isActive: true }; await notifyAdminTelegram(`✅ <b>Account Unfrozen</b>\nUser: ${params.id}`); break
    case 'disable_withdrawal': updateData = { withdrawEnabled: false }; await notifyAdminTelegram(`🏧 <b>Withdrawals Disabled</b>\nUser: ${params.id}`); break
    case 'enable_withdrawal':  updateData = { withdrawEnabled: true }; await notifyAdminTelegram(`🏧 <b>Withdrawals Enabled</b>\nUser: ${params.id}`); break
    case 'change_kyc':
    case 'override_kyc': updateData = { kycStatus: data.kycStatus || data.status }; await notifyAdminTelegram(`🪪 <b>KYC Updated</b>\nUser: ${params.id}\nStatus: ${data.kycStatus || data.status}`); break
    case 'edit_info':    updateData = { name: data.name, email: data.email, phone: data.phone }; await notifyAdminTelegram(`✏️ <b>User Edited</b>\nUser: ${params.id}`); break
    case 'send_notification': {
      await prisma.notification.create({
        data: { userId: params.id, title: 'Admin Message', body: data.message, type: 'info' }
      })
      await trigger(userChannel(params.id), 'notification:new', { title: 'Admin Message', body: data.message })
      await notifyAdminTelegram(`📣 <b>Admin Message Sent</b>\nUser: ${params.id}\nMessage: ${String(data.message || '').slice(0, 200)}`)
      break
    }
    case 'reset_password': {
      const hash = await bcrypt.hash(data.password, 12)
      updateData = { passwordHash: hash }
      await notifyAdminTelegram(`🔐 <b>Password Reset</b>\nUser: ${params.id}`)
      break
    }
    default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({ where: { id: params.id }, data: updateData })
  }

  // Audit log
  await prisma.adminAuditLog.create({
    data: { adminId: admin.id, action: logAction, targetUserId: params.id, details: body },
  })

  return NextResponse.json({ success: true })
}
