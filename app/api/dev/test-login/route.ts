export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const email = new URL(req.url).searchParams.get('email') || 'test@altariscapital.ltd'
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const token = await signToken({ userId: user.id, role: user.role, name: user.name })
  const res = NextResponse.redirect(new URL('/home', req.url))
  res.cookies.set('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
