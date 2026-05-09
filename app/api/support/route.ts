import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { trigger, adminChannel } from '@/lib/pusher'
import { notifyAdminTelegram } from '@/lib/push'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let conv = await prisma.conversation.findUnique({
    where: { userId: user.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  if (!conv) {
    conv = await prisma.conversation.create({
      data: { userId: user.id, status: 'ai_assisting' },
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
  if (!conv) {
    conv = await prisma.conversation.create({ data: { userId: user.id, status: 'ai_assisting' } })
  }

  // Create user message
  const userMsg = await prisma.message.create({
    data: { conversationId: conv.id, sender: 'user', content: content.trim() },
  })

  await prisma.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } })

  // Notify admin
  await trigger(adminChannel, 'chat:message', { ...userMsg, userId: user.id, userName: user.name })
  await notifyAdminTelegram(`💬 <b>New Support Message</b>\nUser: ${user.name}\nMessage: ${content.trim().slice(0, 300)}`)

  // Human-only support: keep the conversation open for the admin team.
  if (conv.status !== 'active') {
    await prisma.conversation.update({ where: { id: conv.id }, data: { status: 'active' } })
  }

  return NextResponse.json({ message: userMsg })
}
