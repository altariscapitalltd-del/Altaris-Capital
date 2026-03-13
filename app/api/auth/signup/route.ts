import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createAndSendOTP } from '@/lib/otp'
import { z } from 'zod'

const schema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  phone:    z.string().optional(),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, password } = schema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name, email, phone, passwordHash,
        balances: {
          create: [
            { currency: 'USD', amount: 0 },
            { currency: 'BTC', amount: 0 },
            { currency: 'ETH', amount: 0 },
            { currency: 'USDT', amount: 0 },
          ],
        },
      },
    })

    await createAndSendOTP(user.id, email, name, 'SIGNUP')

    // Notify admin via WS
    const io = (global as any).io
    if (io) io.to('admin').emit('admin:new_user', { id: user.id, name, email, createdAt: user.createdAt })

    return NextResponse.json({ success: true, userId: user.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Signup failed' }, { status: 500 })
  }
}
