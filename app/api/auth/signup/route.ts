import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createAndSendOTP } from '@/lib/otp'
import { trigger, adminChannel } from '@/lib/pusher'
import { z } from 'zod'
import { uniqueReferralCode, createReferralLink } from '@/lib/referrals'
import { notifyUser } from '@/lib/push'

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

    const passwordHash = await bcrypt.hash(password, 12)
    const ownReferralCode = await uniqueReferralCode(name)
    let referrer = null
    if (referralCode) {
      referrer = await prisma.user.findUnique({ where: { referralCode: referralCode.toUpperCase() }, select: { id: true, name: true } })
      if (!referrer) return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 })
    }

    const user = await prisma.user.create({
      data: {
        name, email, phone, passwordHash, referralCode: ownReferralCode, referredById: referrer?.id,
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

    if (referrer && referrer.id !== user.id) {
      await createReferralLink(referrer.id, user.id, referralCode!.toUpperCase())
      await notifyUser(prisma, referrer.id, 'New referral signup', `${name} joined Altaris Capital with your referral link.`, '/wallet')
    }

    await createAndSendOTP(user.id, email, name, 'SIGNUP')

    // Notify admin via Pusher
    await trigger(adminChannel, 'admin:new_user', { id: user.id, name, email, createdAt: user.createdAt })

    return NextResponse.json({ success: true, userId: user.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Signup failed' }, { status: 500 })
  }
}
