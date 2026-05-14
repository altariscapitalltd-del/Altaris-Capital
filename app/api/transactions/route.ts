import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const limit = 20
  const cursor = searchParams.get('cursor')
  let cursorData: { createdAt: string; id: string } | null = null
  if (cursor) {
    try { cursorData = JSON.parse(decodeURIComponent(cursor)) } catch { cursorData = null }
  }

  const where = cursorData
    ? {
        userId: user.id,
        OR: [
          { createdAt: { lt: new Date(cursorData.createdAt) } },
          { createdAt: new Date(cursorData.createdAt), id: { lt: cursorData.id } },
        ],
      }
    : { userId: user.id }

  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    }),
    prisma.transaction.count({ where: { userId: user.id } }),
  ])

  const hasMore = rows.length > limit
  const transactions = hasMore ? rows.slice(0, limit) : rows
  const last = transactions[transactions.length - 1]
  const nextCursor = hasMore && last ? encodeURIComponent(JSON.stringify({ createdAt: last.createdAt, id: last.id })) : null
  return NextResponse.json({
    transactions,
    total,
    nextCursor,
    hasMore,
  })
}
