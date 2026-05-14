import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calcInvestmentState, calcInvestmentSummary } from '@/lib/investmentMath'

function normalizeProfilePicture<T extends { profilePicture: string | null }>(record: T) {
  if (record.profilePicture && record.profilePicture.includes('.blob.vercel-storage.com')) {
    return {
      ...record,
      profilePicture: `/api/user/avatar/blob?src=${encodeURIComponent(record.profilePicture)}`,
    }
  }
  return record
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [full, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      include: {
        balances: true,
        investments: { where: { status: 'ACTIVE' }, orderBy: { startDate: 'desc' } },
        notifications: { where: { read: false }, take: 10, orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ])

  if (!full) return NextResponse.json({ user: null })

  const investments = full.investments.map((inv) => ({ ...inv, ...calcInvestmentState(inv) }))
  return NextResponse.json({
    user: normalizeProfilePicture({
      ...full,
      investments,
      investmentSummary: calcInvestmentSummary(investments),
    }),
    transactions,
    unreadCount: full.notifications.length,
    fetchedAt: Date.now(),
  })
}
