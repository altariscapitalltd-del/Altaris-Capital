import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const user = await prisma.user.findFirst({
      where: { email, role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    })
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const token = await signToken({ userId: user.id, role: user.role }, true)
    const res = NextResponse.json({ success: true, admin: { id: user.id, name: user.name, role: user.role } })
    res.cookies.set('admin_token', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 })
    return res
  } catch { return NextResponse.json({ error: 'Login failed' }, { status: 500 }) }
}
