import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const settingsSchema = z.object({
  currency: z.string().trim().min(2).max(10).transform((value) => value.toUpperCase()),
  address: z.string().trim().min(8, 'Address is too short').max(255, 'Address is too long'),
})

export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const addresses = await prisma.walletAddress.findMany()
  return NextResponse.json({ addresses })
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminUser(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { currency, address } = settingsSchema.parse(await req.json())

    await prisma.walletAddress.upsert({
      where: { currency },
      update: { address, updatedBy: admin.id },
      create: { currency, address, updatedBy: admin.id },
    })
    await prisma.adminAuditLog.create({
      data: { adminId: admin.id, action: 'update_wallet_address', details: { currency, address } },
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid request' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update wallet address' }, { status: 500 })
  }
}
