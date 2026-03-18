import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAndSendOTP, verifyOTP } from '@/lib/otp'
import { signToken } from '@/lib/auth'
import { z } from 'zod'
import { markReferralEmailVerified, tryQualifyReferral } from '@/lib/referrals'

const otpSchema = z.object({
  action: z.enum(['send', 'verify']),
  userId: z.string().min(1, 'User ID is required'),
  purpose: z.enum(['SIGNUP', 'LOGIN', 'WITHDRAWAL', 'KYC']).default('SIGNUP'),
  code: z.string().trim().length(6).optional(),
}).superRefine((value, ctx) => {
  if (value.action === 'verify' && !value.code) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'OTP code is required for verification',
      path: ['code'],
    })
  }
})

// POST /api/auth/otp — send or verify
export async function POST(req: NextRequest) {
  try {
    const { action, userId, code, purpose } = otpSchema.parse(await req.json())

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    if (action === 'send') {
      await createAndSendOTP(user.id, user.email, user.name, purpose)
      return NextResponse.json({ success: true })
    }

    const result = await verifyOTP(userId, code || '', purpose)
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })

    if (purpose === 'SIGNUP') {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: user.emailVerifiedAt || new Date() } })
      await markReferralEmailVerified(user.id)
      await tryQualifyReferral(user.id)
      const token = await signToken({ userId: user.id, role: user.role })
      const res = NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } })
      res.cookies.set('token', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7 })
      return res
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid request' }, { status: 400 })
    }
    return NextResponse.json({ error: 'OTP request failed' }, { status: 500 })
  }
}
