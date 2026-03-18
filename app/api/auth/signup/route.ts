import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createAndSendOTP } from '@/lib/otp'
import { trigger, adminChannel } from '@/lib/pusher'
import { generateReferralCode } from '@/lib/referrals'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  referralCode: z.string().trim().toUpperCase().optional(),
})

async function uniqueReferralCode(name: string) {
  for (let i = 0; i < 8; i++) {
    const code = generateReferralCode(i === 0 ? name : undefined)
    const exists = await prisma.user.findUnique({ where: { referralCode: code } })
    if (!exists) return code
  }
  return `${generateReferralCode()}${Date.now().toString().slice(-2)}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, password, referralCode } = schema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })

    let referredById: string | undefined
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode }, select: { id: true, email: true, name: true } })
      if (!referrer) return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
      if (referrer.email.toLowerCase() === email.toLowerCase()) return NextResponse.json({ error: 'Self-referrals are not allowed' }, { status: 400 })
      referredById = referrer.id
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        referralCode: await uniqueReferralCode(name),
        referredById,
        balances: { create: [{ currency: 'USD', amount: 0 }, { currency: 'BTC', amount: 0 }, { currency: 'ETH', amount: 0 }, { currency: 'USDT', amount: 0 }] },
        ...(referredById
          ? {
              referralCodeClaims: {
                create: {
                  referrerId: referredById,
                  referralCode: referralCode!,
                  signupCompleted: true,
                },
              },
            }
          : {}),
      },
    })

    await createAndSendOTP(user.id, email, name, 'SIGNUP')

    if (referredById) {
      await prisma.notification.create({
        data: {
          userId: referredById,
          title: 'New referral signup',
          body: `${name} signed up with your referral link. They need verification and a qualifying deposit to count.`,
          url: '/wallet?tab=reward',
        },
      })
    }

    await trigger(adminChannel, 'admin:new_user', { id: user.id, name, email, createdAt: user.createdAt })
    return NextResponse.json({ success: true, userId: user.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Signup failed' }, { status: 500 })
  }
}
