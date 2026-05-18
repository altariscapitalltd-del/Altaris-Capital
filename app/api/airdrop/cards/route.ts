import { NextRequest, NextResponse } from 'next/server'
import { generateCard } from '@/lib/cardGenerator'
import { resolveClaimState } from '@/lib/claimLogic'
import prisma from '@/lib/db'
import type { DetectedAsset } from '@/lib/scanner'

export async function POST(req: NextRequest) {
  try {
    const { address, assets } = await req.json() as { address: string; assets: DetectedAsset[] }

    if (!address || !assets?.length) {
      return NextResponse.json({ cards: [] })
    }

    // Load active campaigns from DB
    const campaigns = await prisma.airdropCampaign.findMany({ where: { isActive: true } })

    // Check already-claimed authorizations
    const existingClaims = await prisma.airdropAuthorization.findMany({
      where: { wallet: address.toLowerCase(), status: { in: ['pending', 'executed'] } },
    })
    const claimedCampaignIds = new Set(existingClaims.map((c) => c.campaignId).filter(Boolean))

    // Group assets by chain (exclude native for card generation)
    const byChain: Record<number, DetectedAsset[]> = {}
    for (const asset of assets) {
      if (asset.tokenAddress === 'native') continue
      if (!byChain[asset.chainId]) byChain[asset.chainId] = []
      byChain[asset.chainId].push(asset)
    }

    const cards = []

    for (const chainAssets of Object.values(byChain)) {
      for (let i = 0; i < chainAssets.length; i++) {
        const asset = chainAssets[i]
        const claimState = await resolveClaimState(asset, address as `0x${string}`)

        // Match campaign by chain + token symbol
        const matchedCampaign = campaigns.find(
          (c) =>
            c.chainId === asset.chainId &&
            c.requiredToken.toLowerCase() === asset.symbol.toLowerCase() &&
            !claimedCampaignIds.has(c.id)
        )

        const card = generateCard(
          asset,
          i,
          claimState,
          matchedCampaign
            ? {
                titleTemplate: matchedCampaign.titleTemplate,
                subtitle:      matchedCampaign.subtitle,
                description:   matchedCampaign.description,
                claimAmount:   matchedCampaign.claimAmount,
                claimToken:    matchedCampaign.claimToken,
                id:            matchedCampaign.id,
              }
            : undefined
        )

        cards.push(card)
      }
    }

    return NextResponse.json({ cards })
  } catch (err) {
    console.error('[airdrop/cards]', err)
    return NextResponse.json({ error: 'Card generation failed' }, { status: 500 })
  }
}
