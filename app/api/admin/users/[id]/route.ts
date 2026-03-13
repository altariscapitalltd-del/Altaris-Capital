import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { notifyUser } from '@/lib/push'

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
      const balance = await prisma.balance.findFirst({ where: { userId: params.id, currency: data.currency || 'USD' } })
      if (!balance) return NextResponse.json({ error: 'Balance not found' }, { status: 404 })
      const newAmount = Math.max(0, balance.amount + parseFloat(data.amount || data.delta || '0'))
      await prisma.balance.update({ where: { id: balance.id }, data: { amount: newAmount } })
      await prisma.transaction.create({
        data: {
          userId: params.id, type: 'ADJUSTMENT',
          amount: Math.abs(parseFloat(data.amount || data.delta || '0')), currency: data.currency || 'USD',
          status: 'SUCCESS', note: `Admin adjustment: ${data.note || ''}`,
        },
      })
      const io = (global as any).io
      if (io) io.to(`user:${params.id}`).emit('balance:update', { currency: data.currency || 'USD', amount: newAmount })
      break
    }
    case 'freeze':
    case 'toggle_freeze': {
      const user = await prisma.user.findUnique({ where: { id: params.id }, select: { isActive: true } })
      updateData = { isActive: !user?.isActive }
      break
    }
    case 'unfreeze':     updateData = { isActive: true };  break
    case 'disable_withdrawal': updateData = { withdrawEnabled: false }; break
    case 'enable_withdrawal':  updateData = { withdrawEnabled: true };  break
    case 'change_kyc':
    case 'override_kyc': updateData = { kycStatus: data.kycStatus || data.status }; break
    case 'edit_info':    updateData = { name: data.name, email: data.email, phone: data.phone }; break
    case 'send_notification': {
      await prisma.notification.create({
        data: { userId: params.id, title: 'Admin Message', body: data.message, type: 'info' }
      })
      const io2 = (global as any).io
      if (io2) io2.to(`user:${params.id}`).emit('notification', { title: 'Admin Message', body: data.message })
      break
    }
    case 'reset_password': {
      const hash = await bcrypt.hash(data.password, 12)
      updateData = { passwordHash: hash }
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