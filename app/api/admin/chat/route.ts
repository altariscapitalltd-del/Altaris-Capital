import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { trigger, userChannel, adminChannel } from '@/lib/pusher'
import { notifyUser } from '@/lib/push'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const conversationId = searchParams.get('conversationId')

  if (conversationId) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ messages: conv.messages })
  }

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

  const body = await req.json()
  const { conversationId, content, message, userId: bodyUserId, action } = body

  if (action === 'end_session' && conversationId) {
    const conv = await prisma.conversation.findFirst({ where: { id: conversationId }, select: { userId: true } })
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    await prisma.conversation.update({ where: { id: conversationId }, data: { status: 'ended', updatedAt: new Date() } })
    await trigger(userChannel(conv.userId), 'chat:ended', {})
    return NextResponse.json({ success: true })
  }

  const text = content ?? message
  if (!text?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  const conv = await prisma.conversation.findFirst({ where: { id: conversationId }, include: { user: { select: { id: true } } } })
  if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  const userId = bodyUserId ?? conv.user?.id

  const msg = await prisma.message.create({
    data: { conversationId, sender: 'admin', content: text.trim() },
  })

  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })

  await trigger(userChannel(userId), 'chat:message', { ...msg, sender: 'admin' })
  await trigger(adminChannel, 'chat:message', { ...msg, sender: 'admin', userId })

  await notifyUser(
    prisma,
    userId,
    'Support reply',
    `Support replied: ${text.trim().slice(0, 140)}`,
    '/support'
  )

  return NextResponse.json({ message: msg })
}
