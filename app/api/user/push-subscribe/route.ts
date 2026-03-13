import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const subscription = await req.json()
  await prisma.user.update({ where: { id: user.id }, data: { pushSubscription: subscription } })
  return NextResponse.json({ success: true })
}
