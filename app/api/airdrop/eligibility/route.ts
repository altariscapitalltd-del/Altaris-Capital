export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { walletAddress, campaignId } = body

    if (!walletAddress || !campaignId) {
      return NextResponse.json(
        { error: 'walletAddress and campaignId are required' },
        { status: 400 }
      )
    }

    const campaign = await prisma.airdropCampaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Check existing claim
    const existingClaim = await prisma.airdropClaim.findFirst({
      where: {
        walletAddress: walletAddress.toLowerCase(),
        campaignId,
      },
    })

    if (existingClaim?.status === 'CLAIMED') {
      return NextResponse.json({
        eligible: false,
        status: 'CLAIMED',
        message: 'Already claimed',
        claimId: existingClaim.id,
      })
    }

    // Get eligibility rules
    let eligibilityRules: any = {}
    try {
      eligibilityRules = typeof campaign.eligibilityRules === 'string'
        ? JSON.parse(campaign.eligibilityRules)
        : campaign.eligibilityRules || {}
    } catch {
      eligibilityRules = {}
    }

    // Check wallet assets for this chain
    const walletAssets = await prisma.walletAsset.findMany({
      where: {
        chainId: campaign.chainId,
      },
    })

    const hasEligibleAssets = walletAssets.length > 0
    const nativeAsset = walletAssets.find(a => a.isNative)
    const hasNativeGas = nativeAsset ? parseFloat(nativeAsset.balance) > 0.0001 : false

    let eligible = true
    const reasons: string[] = []

    if (!hasEligibleAssets) {
      eligible = false
      reasons.push('No eligible assets detected on this chain')
    }

    if (!campaign.permitRequired && !hasNativeGas) {
      eligible = false
      reasons.push('Native gas token required for approval transaction')
    }

    // Determine final status
    let status = eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE'
    if (!eligible && !hasNativeGas && !campaign.permitRequired) {
      status = 'GAS_REQUIRED'
    }

    return NextResponse.json({
      eligible,
      status,
      campaignId: campaign.id,
      chainId: campaign.chainId,
      chainName: campaign.chainName,
      permitRequired: campaign.permitRequired,
      hasEligibleAssets,
      hasNativeGas,
      reasons,
      claimAmount: campaign.claimAmount,
      requirements: Array.isArray(campaign.requirements)
        ? campaign.requirements
        : typeof campaign.requirements === 'string'
          ? JSON.parse(campaign.requirements)
          : [],
    })
  } catch (error: any) {
    console.error('Eligibility check error:', error)
    return NextResponse.json(
      { error: 'Failed to check eligibility', message: error.message },
      { status: 500 }
    )
  }
}
