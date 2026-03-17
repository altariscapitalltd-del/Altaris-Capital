import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { prisma } from './db'

const DEV_USER_SECRET = 'altaris-secret-change-this'
const DEV_ADMIN_SECRET = 'altaris-admin-secret-change-this'

function secretFor(admin = false) {
  const key = admin ? process.env.ADMIN_JWT_SECRET : process.env.JWT_SECRET
  if (key && key.length >= 16) return new TextEncoder().encode(key)
  if (process.env.NODE_ENV === 'production') return null
  return new TextEncoder().encode(admin ? DEV_ADMIN_SECRET : DEV_USER_SECRET)
}

export async function signToken(payload: Record<string, unknown>, admin = false) {
  const secret = secretFor(admin)
  if (!secret) throw new Error(`${admin ? 'ADMIN_JWT_SECRET' : 'JWT_SECRET'} is required in production`)

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string, admin = false) {
  try {
    const secret = secretFor(admin)
    if (!secret) return null
    const { payload } = await jwtVerify(token, secret)
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
