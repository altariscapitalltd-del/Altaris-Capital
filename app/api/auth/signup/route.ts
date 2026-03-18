import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createAndSendOTP } from '@/lib/otp'
import { trigger, adminChannel } from '@/lib/pusher'
import { createDefaultCampaignIfMissing, generateUniqueReferralCode } from '@/lib/referrals'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  referralCode: z.string().trim().toUpperCase().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, password, referralCode } = schema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })

    let referrer = null
    try {
      if (referralCode) {
        referrer = await prisma.user.findUnique({ where: { referralCode }, select: { id: true, email: true, phone: true } })
        if (!referrer) return NextResponse.json({ error: 'Referral code is invalid' }, { status: 400 })
        if (referrer.email.toLowerCase() === email.toLowerCase()) {
          return NextResponse.json({ error: 'Self-referrals are not allowed' }, { status: 400 })
        }
        if (phone && referrer.phone && referrer.phone === phone) {
          return NextResponse.json({ error: 'This referral could not be applied' }, { status: 400 })
        }
      }
    } catch {
      referrer = null
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const generatedReferralCode = await generateUniqueReferralCode(prisma, `${name}${email.split('@')[0]}`)

    let user
    try {
      user = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash,
          referralCode: generatedReferralCode,
          ...(referrer ? { referredById: referrer.id } : {}),
          balances: {
            create: [
              { currency: 'USD', amount: 0 },
              { currency: 'BTC', amount: 0 },
              { currency: 'ETH', amount: 0 },
              { currency: 'USDT', amount: 0 },
            ],
          },
          ...(referrer ? {
            incomingReferral: { create: { referrerId: referrer.id } },
          } : {}),
        },
      })
      await createDefaultCampaignIfMissing(prisma)
    } catch (error) {
      console.warn('[auth/signup] falling back to legacy signup mode', error)
      user = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash,
          balances: {
            create: [
              { currency: 'USD', amount: 0 },
              { currency: 'BTC', amount: 0 },
              { currency: 'ETH', amount: 0 },
              { currency: 'USDT', amount: 0 },
            ],
          },
        } as any,
      })
    }

    await createAndSendOTP(user.id, email, name, 'SIGNUP')
    await trigger(adminChannel, 'admin:new_user', { id: user.id, name, email, createdAt: user.createdAt, referralCode: generatedReferralCode })

    return NextResponse.json({ success: true, userId: user.id, referralCode: generatedReferralCode })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Signup failed' }, { status: 500 })
  }
}
