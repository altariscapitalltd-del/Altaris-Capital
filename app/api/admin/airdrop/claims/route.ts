import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return unauthorized()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const campaignId = searchParams.get('campaignId')

    const where: any = {}
    if (status) where.status = status
    if (campaignId) where.campaignId = campaignId

    const claims = await prisma.airdropClaim.findMany({
      where,
      include: { campaign: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })

    return NextResponse.json({ claims })
  } catch (error: any) {
    console.error('Admin claims error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
