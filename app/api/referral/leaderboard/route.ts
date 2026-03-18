import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'monthly'

  const now = new Date()
  const startDate = new Date()
  if (period === 'weekly') {
    startDate.setDate(now.getDate() - 7)
  } else {
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)
  }

  const referrals = await prisma.referral.groupBy({
    by: ['referrerId'],
    where: {
      status: { in: ['QUALIFIED', 'REWARDED'] },
      qualifiedAt: { gte: startDate },
    },
    _count: { referrerId: true },
    orderBy: { _count: { referrerId: 'desc' } },
    take: 20,
  })

  const referrerIds = referrals.map(r => r.referrerId)
  const users = await prisma.user.findMany({
    where: { id: { in: referrerIds } },
    select: { id: true, name: true, profilePicture: true },
  })

  const userMap = Object.fromEntries(users.map(u => [u.id, u]))

  const leaderboard = referrals.map((r, i) => ({
    rank: i + 1,
    userId: r.referrerId,
    name: userMap[r.referrerId]?.name || 'Anonymous',
    avatar: userMap[r.referrerId]?.profilePicture || null,
    count: r._count.referrerId,
    isMe: r.referrerId === user.id,
  }))

  const myEntry = leaderboard.find(e => e.isMe)
  let myRank = myEntry?.rank || null

  if (!myRank) {
    const myCount = await prisma.referral.count({
      where: { referrerId: user.id, status: { in: ['QUALIFIED', 'REWARDED'] }, qualifiedAt: { gte: startDate } },
    })
    if (myCount > 0) {
      const ahead = await prisma.referral.groupBy({
        by: ['referrerId'],
        where: { status: { in: ['QUALIFIED', 'REWARDED'] }, qualifiedAt: { gte: startDate } },
        having: { referrerId: { _count: { gt: myCount } } },
      })
      myRank = ahead.length + 1
    }
  }

  return NextResponse.json({ leaderboard, period, myRank })
}
