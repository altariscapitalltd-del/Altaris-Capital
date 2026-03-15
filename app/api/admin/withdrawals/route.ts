import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const withdrawals = await prisma.transaction.findMany({
    where: { type: 'WITHDRAWAL' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  })

  return NextResponse.json({ withdrawals })
}
