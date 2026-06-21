export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { rateLimit, clientIp, tooManyHeaders } from '@/lib/rate-limit'
import { z } from 'zod'

const schema = z.object({
  email:    z.string().email(),
  password: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    // Throttle brute-force by IP (8/min)
    const ip = clientIp(req)
    const ipLimit = rateLimit(`login:ip:${ip}`, 8, 60_000)
    if (!ipLimit.ok) {
      return NextResponse.json({ error: 'Too many attempts. Please wait a moment and try again.' }, { status: 429, headers: tooManyHeaders(ipLimit.retryAfter) })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })

    const { email, password } = parsed.data

    // Throttle targeted brute-force against a single account (5 per 5 min)
    const emailLimit = rateLimit(`login:email:${email.toLowerCase().trim()}`, 5, 5 * 60_000)
    if (!emailLimit.ok) {
      return NextResponse.json({ error: 'Too many attempts for this account. Please wait a few minutes.' }, { status: 429, headers: tooManyHeaders(emailLimit.retryAfter) })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    if (!user.isActive) return NextResponse.json({ error: 'Account is suspended. Contact support.' }, { status: 403 })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    const token = await signToken({ userId: user.id, role: user.role, name: user.name })
    const res = NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } })
    const proto = req.headers.get('x-forwarded-proto') || 'http'
    const host = (req.headers.get('host') || '').toLowerCase()
    const isLocalHost = host.startsWith('localhost') || host.startsWith('127.0.0.1')
    const secureCookie = proto === 'https' || (process.env.NODE_ENV === 'production' && !isLocalHost)
    res.cookies.set('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookie,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch (e: any) {
    console.error('[Login] error:', e?.message ?? e)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
