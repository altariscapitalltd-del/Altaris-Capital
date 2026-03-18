import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'monthly'
  const now = new Date()
  const start = new Date(now)
  if (period === 'weekly') start.setDate(now.getDate() - 7)
  else start.setMonth(now.getMonth() - 1)

  const rows = await prisma.referral.groupBy({
    by: ['referrerId'],
    where: { status: 'QUALIFIED', qualifiedAt: { gte: start, lte: now } },
    _count: { referrerId: true },
    orderBy: { _count: { referrerId: 'desc' } },
    take: 10,
  })
  const users = await prisma.user.findMany({ where: { id: { in: rows.map((row) => row.referrerId) } }, select: { id: true, name: true, referralCode: true } })
  const mapped = rows.map((row, index) => ({
    rank: index + 1,
    user: users.find((user) => user.id === row.referrerId)?.name || 'Anonymous Investor',
    referralCode: users.find((user) => user.id === row.referrerId)?.referralCode || '',
    totalReferrals: row._count.referrerId,
    bonus: index === 0 ? 1000 : index === 1 ? 500 : index === 2 ? 250 : 0,
  }))
  return NextResponse.json({ period, leaderboard: mapped })
}
