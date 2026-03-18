import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createAndSendOTP } from '@/lib/otp'
import { trigger, adminChannel } from '@/lib/pusher'
import { z } from 'zod'
import { createReferralFromCode, createUniqueReferralCode } from '@/lib/referrals'

const schema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  phone:    z.string().optional(),
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
    const uniqueReferralCode = await createUniqueReferralCode(name, email)
    const baseUserData = {
      name, email, phone, passwordHash,
      balances: {
        create: [
          { currency: 'USD', amount: 0 },
          { currency: 'BTC', amount: 0 },
          { currency: 'ETH', amount: 0 },
          { currency: 'USDT', amount: 0 },
        ],
      },
    }

    let user
    try {
      user = await prisma.user.create({ data: { ...baseUserData, referralCode: uniqueReferralCode } as any })
    } catch (createError: any) {
      const message = String(createError?.message || '')
      if (!message.includes('referralCode')) throw createError
      user = await prisma.user.create({ data: baseUserData as any })
    }

    await createAndSendOTP(user.id, email, name, 'SIGNUP')
    try {
      await createReferralFromCode(user.id, referralCode)
    } catch (referralError) {
      console.error('Referral bootstrap skipped', referralError)
    }

    // Notify admin via Pusher
    await trigger(adminChannel, 'admin:new_user', { id: user.id, name, email, createdAt: user.createdAt })

    return NextResponse.json({ success: true, userId: user.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Signup failed' }, { status: 500 })
  }
}
