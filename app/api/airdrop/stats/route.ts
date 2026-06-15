import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const totalCampaigns = await prisma.airdropCampaign.count()
    const activeCampaigns = await prisma.airdropCampaign.count({
      where: { status: 'ACTIVE' },
    })
    const totalClaims = await prisma.airdropClaim.count()
    const groupedWallets = await prisma.airdropClaim.groupBy({
      by: ['walletAddress'],
      _count: { walletAddress: true },
    })
    const totalWallets = groupedWallets.length

    return NextResponse.json({
      totalCampaigns,
      activeCampaigns,
      totalClaims,
      totalWallets,
      totalValueClaimed: '0',
    })
  } catch (error: any) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats', message: error.message },
      { status: 500 }
    )
  }
}
