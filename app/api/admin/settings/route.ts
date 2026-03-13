import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const addresses = await prisma.walletAddress.findMany()
  return NextResponse.json({ addresses })
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { currency, address } = await req.json()
  await prisma.walletAddress.upsert({
    where: { currency },
    update: { address, updatedBy: admin.id },
    create: { currency, address, updatedBy: admin.id },
  })
  await prisma.adminAuditLog.create({
    data: { adminId: admin.id, action: 'update_wallet_address', details: { currency, address } },
  })
  return NextResponse.json({ success: true })
}
