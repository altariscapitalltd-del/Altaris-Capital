import bcrypt from 'bcryptjs'
import { prisma } from './db'
import { sendOTPEmail } from './email'

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function createAndSendOTP(userId: string, email: string, name: string, purpose: string) {
  // Invalidate previous OTPs for this user+purpose
  await prisma.oTP.updateMany({
    where: { userId, purpose: purpose as any, used: false },
    data: { used: true },
  })

  const otp = generateOTP()
  const hash = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  await prisma.oTP.create({
    data: { userId, code: hash, purpose: purpose as any, expiresAt },
  })

  await sendOTPEmail(email, name, otp, purpose)
  return true
}

export async function verifyOTP(userId: string, code: string, purpose: string): Promise<{ success: boolean; error?: string }> {
  const otp = await prisma.oTP.findFirst({
    where: {
      userId,
      purpose: purpose as any,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!otp) return { success: false, error: 'OTP expired or not found. Please request a new code.' }
  if (otp.attempts >= 3) return { success: false, error: 'Too many failed attempts. Please request a new code.' }

  const valid = await bcrypt.compare(code, otp.code)

  if (!valid) {
    await prisma.oTP.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } })
    return { success: false, error: 'Invalid code. Please try again.' }
  }

  await prisma.oTP.update({ where: { id: otp.id }, data: { used: true } })
  return { success: true }
}
