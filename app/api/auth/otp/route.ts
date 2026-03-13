import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAndSendOTP, verifyOTP } from '@/lib/otp'
import { signToken } from '@/lib/auth'
import { z } from 'zod'

// POST /api/auth/otp — send or verify
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, userId, code, purpose } = body

  if (action === 'send') {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    await createAndSendOTP(user.id, user.email, user.name, purpose || 'SIGNUP')
    return NextResponse.json({ success: true })
  }

  if (action === 'verify') {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const result = await verifyOTP(userId, code, purpose || 'SIGNUP')
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })

    // On signup verification, activate the account
    if (purpose === 'SIGNUP') {
      // Create a session token
      const token = await signToken({ userId: user.id, role: user.role })
      const res = NextResponse.json({ success: true, user: { id: user.id, name: user.name, role: user.role } })
      res.cookies.set('token', token, { httpOnly: true, sameSite: 'strict', maxAge: 60 * 60 * 24 * 7 })
      return res
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
