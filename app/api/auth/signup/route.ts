export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createAndSendOTP } from '@/lib/otp'
import { trigger, adminChannel } from '@/lib/pusher'
import { notifyAdminTelegram } from '@/lib/push'
import { createWallet, createChainWallets } from '@/lib/wallet'
import { z } from 'zod'

const schema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  phone:    z.string().optional(),
  password: z.string().min(8),
  referralCode: z.string().optional(),
})

function generateReferralCode(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `${base}${rand}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, password, referralCode } = schema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })

    let referrerId: string | null = null
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode } })
      if (referrer && referrer.email !== email.toLowerCase().trim()) {
        referrerId = referrer.id
      }
    }

    let myCode = generateReferralCode(name)
    let codeExists = await prisma.user.findUnique({ where: { referralCode: myCode } })
    while (codeExists) {
      myCode = generateReferralCode(name)
      codeExists = await prisma.user.findUnique({ where: { referralCode: myCode } })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        phone,
        passwordHash,
        referralCode: myCode,
        referredById: referrerId || undefined,
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

    // Generate a per-user custodial EVM wallet (defensive: never block signup
    // if the wallet columns aren't migrated yet — private key stored encrypted)
    try {
      const w = createWallet()
      const chains = createChainWallets()
      await prisma.user.update({
        where: { id: user.id },
        data: { walletAddress: w.address, walletPrivateKey: w.encryptedKey, walletCreatedAt: new Date(), chainWallets: chains as any },
      })
      // Register with Alchemy webhook — fire-and-forget, never blocks signup
      import('@/lib/alchemy-notify').then(({ addAddressesToWebhook }) =>
        addAddressesToWebhook([w.address]).catch(() => {})
      )
    } catch (e: any) {
      console.error('[Signup] wallet generation skipped:', e?.message ?? e)
    }

    if (referrerId) {
      await prisma.referral.create({
        data: {
          referrerId,
          referredId: user.id,
          emailVerified: false,
          kycApproved: false,
          depositMade: false,
        },
      })

      await prisma.user.findUnique({ where: { id: referrerId }, select: { id: true } }).then(async (ref) => {
        if (ref) {
          try {
            const { notifyUser } = await import('@/lib/push')
            await notifyUser(
              prisma, referrerId!,
              'New Referral Signup! 👥',
              `Someone signed up using your referral link. Complete their verification to earn your $200 bonus.`,
              '/rewards'
            )
          } catch {}
        }
      })
    }

    await createAndSendOTP(user.id, email, name, 'SIGNUP')

    await trigger(adminChannel, 'admin:new_user', { id: user.id, name, email, createdAt: user.createdAt })
    await notifyAdminTelegram(`🆕 <b>New Signup</b>\nName: ${name}\nEmail: ${email}\nPhone: ${phone || '—'}`)

    return NextResponse.json({ success: true, userId: user.id })
  } catch (e: any) {
    console.error('[Signup]', e?.message ?? e)
    return NextResponse.json({ error: e.message || 'Signup failed' }, { status: 500 })
  }
}
