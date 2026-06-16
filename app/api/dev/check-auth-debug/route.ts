import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email') || ''
  const password = searchParams.get('password') || ''

  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) {
      const allUsers = await prisma.user.findMany({
        select: { email: true, role: true }
      })
      return NextResponse.json({ 
        success: false, 
        step: 'user_lookup', 
        message: 'User not found in DB',
        queryEmail: email,
        availableUsers: allUsers
      })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    return NextResponse.json({
      success: valid,
      step: 'password_compare',
      userFound: {
        id: user.id,
        email: user.email,
        isActive: user.isActive,
        role: user.role,
        hasHash: !!user.passwordHash
      },
      valid
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, step: 'error', message: error?.message ?? error })
  }
}
