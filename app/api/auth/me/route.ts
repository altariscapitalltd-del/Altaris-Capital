import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      kycStatus: true,
      bonusClaimed: true,
      referralCode: true,
      rewardBalance: true,
      notifications: { where: { read: false }, take: 10, orderBy: { createdAt: 'desc' } },
    },
  })

  return NextResponse.json({ user: fullUser })
}
