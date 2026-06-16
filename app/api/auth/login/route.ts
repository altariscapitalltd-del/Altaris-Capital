import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { signToken } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  email:    z.string().email(),
  password: z.string(),
})

function normalizeEmail(email: string) {
  return email.toLowerCase().trim()
}

function configuredCredential(name: string) {
  return process.env[name]?.trim()
}

async function findLoginUser(email: string) {
  const normalizedEmail = normalizeEmail(email)
  const exact = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (exact) return exact

  return prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
  })
}

async function comparePassword(password: string, passwordHash: string) {
  if (await bcrypt.compare(password, passwordHash)) return true

  const trimmedPassword = password.trim()
  return trimmedPassword !== password && await bcrypt.compare(trimmedPassword, passwordHash)
}

async function createConfiguredLoginUser(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email)
  const seedEmail = configuredCredential('SEED_DEMO_EMAIL') || configuredCredential('BOOTSTRAP_USER_EMAIL')
  const seedPassword = configuredCredential('SEED_DEMO_PASSWORD') || configuredCredential('BOOTSTRAP_USER_PASSWORD')

  if (!seedEmail || !seedPassword) return null
  if (normalizeEmail(seedEmail) !== normalizedEmail) return null
  if (password !== seedPassword && password.trim() !== seedPassword) return null

  const passwordHash = await bcrypt.hash(seedPassword, 12)
  return prisma.user.create({
    data: {
      name: configuredCredential('SEED_DEMO_NAME') || configuredCredential('BOOTSTRAP_USER_NAME') || 'Demo User',
      email: normalizedEmail,
      passwordHash,
      role: 'USER',
      kycStatus: 'APPROVED',
      balances: {
        create: [
          { currency: 'USD', amount: 5000 },
          { currency: 'BTC', amount: 0.05 },
          { currency: 'ETH', amount: 0.5 },
          { currency: 'USDT', amount: 2000 },
        ],
      },
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })

    const { email, password } = parsed.data
    const user = await findLoginUser(email) || await createConfiguredLoginUser(email, password)
    if (!user) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    if (!user.isActive) return NextResponse.json({ error: 'Account is suspended. Contact support.' }, { status: 403 })

    const valid = await comparePassword(password, user.passwordHash)
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
