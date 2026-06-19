export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const walletAddress = searchParams.get('walletAddress')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      )
    }

    const claims = await prisma.airdropClaim.findMany({
      where: {
        walletAddress: walletAddress.toLowerCase(),
      },
      include: {
        campaign: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ claims })
  } catch (error: any) {
    console.error('Fetch claims error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch claims', message: error.message },
      { status: 500 }
    )
  }
}
