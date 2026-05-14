import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'altaris-secret-change-this')

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') || 'Demo User'
  const email = searchParams.get('email') || 'demo@altariscapital.ltd'

  const token = await new SignJWT({
    userId: 'mock-user-1',
    role: 'USER',
    name,
    email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  const redirectUrl = new URL('/home', req.url)
  const res = NextResponse.redirect(redirectUrl)
  res.cookies.set('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
