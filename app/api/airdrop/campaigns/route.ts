import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, CampaignStatus } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') as CampaignStatus | 'all' | null
    const chainId = searchParams.get('chainId')
    const search = searchParams.get('search')

    const where: any = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (chainId) {
      where.chainId = parseInt(chainId)
    }

    if (search) {
      where.OR = [
        { titleTemplate: { contains: search, mode: 'insensitive' } },
        { chainName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const campaigns = await prisma.airdropCampaign.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ campaigns })
  } catch (error: any) {
    console.error('Airdrop campaigns error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns', message: error.message },
      { status: 500 }
    )
  }
}
