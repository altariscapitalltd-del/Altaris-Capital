import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const where = q ? {
    OR: [
      { email: { contains: q, mode: 'insensitive' as const } },
      { name:  { contains: q, mode: 'insensitive' as const } },
    ],
  } : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, kycStatus: true,
        isActive: true, withdrawEnabled: true, createdAt: true, lastLoginAt: true,
        lastKnownCity: true, lastKnownCountry: true,
        balances: { select: { currency: true, amount: true } },
        _count: { select: { transactions: true, investments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) })
}
