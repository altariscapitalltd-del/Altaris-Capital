import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { trigger, adminChannel } from '@/lib/pusher'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let conv = await prisma.conversation.findUnique({
    where: { userId: user.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  if (!conv) {
    conv = await prisma.conversation.create({
      data: { userId: user.id, status: 'active' },
      include: { messages: true },
    })
  }

  return NextResponse.json({ conversation: conv })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 })

  let conv = await prisma.conversation.findUnique({ where: { userId: user.id } })
  if (!conv) conv = await prisma.conversation.create({ data: { userId: user.id } })

  const msg = await prisma.message.create({
    data: { conversationId: conv.id, sender: 'user', content: content.trim() },
  })

  await prisma.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } })

  await trigger(adminChannel, 'chat:message', { ...msg, userName: user.name, userId: user.id })

  return NextResponse.json({ message: msg })
}
