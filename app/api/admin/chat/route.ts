import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const conversations = await prisma.conversation.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, kycStatus: true, balances: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ conversations })
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conversationId, content, userId } = await req.json()

  const msg = await prisma.message.create({
    data: { conversationId, sender: 'admin', content },
  })

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })

  const io = (global as any).io
  if (io) {
    io.to(`user:${userId}`).emit('chat:message', { ...msg, sender: 'admin' })
    io.to('admin').emit('chat:message', { ...msg, sender: 'admin' })
  }

  return NextResponse.json({ message: msg })
}
