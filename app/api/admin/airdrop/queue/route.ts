import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = await verifyToken(token, true).catch(() => null)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'pending'
  const page   = parseInt(searchParams.get('page') ?? '1')
  const limit  = 50

  const [authorizations, total] = await Promise.all([
    prisma.airdropAuthorization.findMany({
      where:   { status },
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
      include: { campaign: { select: { titleTemplate: true, claimToken: true } } },
    }),
    prisma.airdropAuthorization.count({ where: { status } }),
  ])

  return NextResponse.json({ authorizations, total, page, pages: Math.ceil(total / limit) })
}
