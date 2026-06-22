export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

async function adminGuard() {
  const token = (await cookies()).get('token')?.value
  if (!token) return null
  const payload = (await verifyToken(token)) as any
  if (!payload || payload.role !== 'ADMIN') return null
  return payload
}

export async function GET() {
  if (!await adminGuard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const plans = await prisma.investmentPlan.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
  return NextResponse.json({ plans })
}

export async function POST(req: NextRequest) {
  if (!await adminGuard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const plan = await prisma.investmentPlan.create({
    data: {
      name: body.name,
      description: body.description || null,
      category: body.category || 'Crypto',
      symbol: String(body.symbol || '').toUpperCase(),
      image: body.image || null,
      dailyRoi: Number(body.dailyRoi),
      duration: Number(body.duration),
      minDeposit: Number(body.minDeposit),
      riskLevel: Number(body.riskLevel) || 3,
      badge: body.badge || null,
      isActive: body.isActive !== false,
      sortOrder: Number(body.sortOrder) || 0,
    },
  })
  return NextResponse.json({ plan })
}

export async function PUT(req: NextRequest) {
  if (!await adminGuard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { id, ...data } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const plan = await prisma.investmentPlan.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.symbol !== undefined && { symbol: String(data.symbol).toUpperCase() }),
      ...(data.image !== undefined && { image: data.image }),
      ...(data.dailyRoi !== undefined && { dailyRoi: Number(data.dailyRoi) }),
      ...(data.duration !== undefined && { duration: Number(data.duration) }),
      ...(data.minDeposit !== undefined && { minDeposit: Number(data.minDeposit) }),
      ...(data.riskLevel !== undefined && { riskLevel: Number(data.riskLevel) }),
      ...(data.badge !== undefined && { badge: data.badge }),
      ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
      ...(data.sortOrder !== undefined && { sortOrder: Number(data.sortOrder) }),
    },
  })
  return NextResponse.json({ plan })
}

export async function DELETE(req: NextRequest) {
  if (!await adminGuard()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.investmentPlan.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
