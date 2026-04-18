import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { prisma } from './db'

const isProd = process.env.NODE_ENV === 'production'

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (secret) return new TextEncoder().encode(secret)
  if (isProd) throw new Error('JWT_SECRET is required in production')
  return new TextEncoder().encode('altaris-secret-change-this')
}

function getAdminJwtSecret() {
  const secret = process.env.ADMIN_JWT_SECRET
  if (secret) return new TextEncoder().encode(secret)
  if (isProd) throw new Error('ADMIN_JWT_SECRET is required in production')
  return new TextEncoder().encode('altaris-admin-secret-change-this')
}

export async function signToken(payload: Record<string, unknown>, admin = false) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(admin ? getAdminJwtSecret() : getJwtSecret())
}

export async function verifyToken(token: string, admin = false) {
  try {
    const { payload } = await jwtVerify(token, admin ? getAdminJwtSecret() : getJwtSecret())
    return payload
  } catch {
    return null
  }
}

export async function getAuthUser(req?: NextRequest) {
  let token: string | undefined
  if (req) {
    token = req.cookies.get('token')?.value
  } else {
    const cookieStore = cookies()
    token = cookieStore.get('token')?.value
  }
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload?.userId) return null
  return prisma.user.findUnique({
    where: { id: payload.userId as string },
    select: {
      id: true, email: true, name: true, role: true,
      kycStatus: true, isActive: true, withdrawEnabled: true,
      bonusClaimed: true, profilePicture: true, createdAt: true, lastLoginAt: true,
    },
  })
}

export async function getAdminUser(req?: NextRequest) {
  let token: string | undefined
  if (req) {
    token = req.cookies.get('admin_token')?.value
  } else {
    const cookieStore = cookies()
    token = cookieStore.get('admin_token')?.value
  }
  if (!token) return null
  const payload = await verifyToken(token, true)
  if (!payload?.userId) return null
  return prisma.user.findFirst({
    where: { id: payload.userId as string, role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
    select: { id: true, email: true, name: true, role: true },
  })
}
