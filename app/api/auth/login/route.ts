import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const schema = z.object({
  email:    z.string().email(),
  password: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const { email, password } = schema.parse(await req.json())
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        role: true,
        passwordHash: true,
        isActive: true,
      },
    })
    if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    if (!user.isActive) return NextResponse.json({ error: 'Account is suspended. Contact support.' }, { status: 403 })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    const token = await signToken({ userId: user.id, role: user.role, name: user.name })
    const res = NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } })
    res.cookies.set('token', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7 })
    return res
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json({ error: 'Database is not configured. Set DATABASE_URL and restart the server.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
