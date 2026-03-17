import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createAndSendOTP } from '@/lib/otp'
import { trigger, adminChannel } from '@/lib/pusher'
import { z } from 'zod'
import { attachReferralOnSignup, generateUniqueReferralCode } from '@/lib/referrals'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  referralCode: z.string().trim().min(4).max(30).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, password, referralCode } = schema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })

    if (phone) {
      const phoneExists = await prisma.user.findFirst({ where: { phone } })
      if (phoneExists) return NextResponse.json({ error: 'Phone number already in use' }, { status: 400 })
    }

    if (referralCode) {
      const ref = await prisma.user.findUnique({ where: { referralCode }, select: { email: true, phone: true } })
      if (!ref) return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
      if (ref.email.toLowerCase() === email.toLowerCase()) return NextResponse.json({ error: 'Self-referral is not allowed' }, { status: 400 })
      if (phone && ref.phone && ref.phone === phone) return NextResponse.json({ error: 'Self-referral is not allowed' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const generatedCode = await generateUniqueReferralCode()
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        referralCode: generatedCode,
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

    await attachReferralOnSignup(user.id, referralCode)
    await createAndSendOTP(user.id, email, name, 'SIGNUP')

    await trigger(adminChannel, 'admin:new_user', { id: user.id, name, email, createdAt: user.createdAt })

    return NextResponse.json({ success: true, userId: user.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Signup failed' }, { status: 500 })
  }
}
