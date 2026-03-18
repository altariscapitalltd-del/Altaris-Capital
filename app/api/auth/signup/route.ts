import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createAndSendOTP } from '@/lib/otp'
import { trigger, adminChannel } from '@/lib/pusher'
import { generateReferralCode, notifyReferrerOfSignup } from '@/lib/referrals'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  referralCode: z.string().trim().min(4).max(32).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, password, referralCode } = schema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })

    let referrer = null as null | { id: string; email: string; referralCode: string }
    if (referralCode) {
      referrer = await prisma.user.findUnique({ where: { referralCode }, select: { id: true, email: true, referralCode: true } })
      if (!referrer) return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
      if (referrer.email.toLowerCase() === email.toLowerCase()) {
        return NextResponse.json({ error: 'Self-referrals are not allowed' }, { status: 400 })
      }
    }

    const passwordHash = await bcrypt.hash(password, 12)

    let code = generateReferralCode(name)
    while (await prisma.user.findUnique({ where: { referralCode: code } })) code = generateReferralCode(name)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        referralCode: code,
        referredByUserId: referrer?.id,
        balances: { create: [{ currency: 'USD', amount: 0 }, { currency: 'BTC', amount: 0 }, { currency: 'ETH', amount: 0 }, { currency: 'USDT', amount: 0 }] },
      },
    })

    if (referrer) {
      await prisma.referral.create({
        data: {
          referrerUserId: referrer.id,
          referredUserId: user.id,
          referredByCode: referrer.referralCode,
          status: 'SIGNED_UP',
        },
      })
    }

    await createAndSendOTP(user.id, email, name, 'SIGNUP')
    if (referrer) await notifyReferrerOfSignup(prisma, user.id)

    await trigger(adminChannel, 'admin:new_user', { id: user.id, name, email, createdAt: user.createdAt })

    return NextResponse.json({ success: true, userId: user.id, referralCode: code })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Signup failed' }, { status: 500 })
  }
}
