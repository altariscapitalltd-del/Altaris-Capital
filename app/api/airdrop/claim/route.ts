import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, ClaimStatus, AuthType } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      walletAddress,
      campaignId,
      authType = 'PERMIT',
      signature,
      txHash,
    } = body

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

    if (campaign.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Campaign is not active', status: campaign.status },
        { status: 400 }
      )
    }

    // Check for existing claim
    const existingClaim = await prisma.airdropClaim.findFirst({
      where: {
        walletAddress: walletAddress.toLowerCase(),
        campaignId,
      },
    })

    if (existingClaim?.status === 'CLAIMED') {
      return NextResponse.json({
        success: false,
        status: 'CLAIMED',
        message: 'You have already claimed this airdrop',
        claimId: existingClaim.id,
      })
    }

    if (existingClaim?.status === 'CLAIMING') {
      return NextResponse.json({
        success: false,
        status: 'CLAIMING',
        message: 'Claim is being processed',
        claimId: existingClaim.id,
      })
    }

    // Ensure guest user exists
    const guestUserId = 'guest-' + walletAddress.toLowerCase()
    await prisma.user.upsert({
      where: { id: guestUserId },
      update: { lastLoginAt: new Date() },
      create: {
        id: guestUserId,
        email: `${walletAddress.toLowerCase()}@guest.altaris.io`,
        name: `Guest Wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        passwordHash: 'guest-no-password',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      },
    })

    // Determine auth type based on campaign
    const claimAuthType = (campaign.permitRequired ? 'PERMIT' : authType) as AuthType

    // Create or update claim
    const claim = existingClaim
      ? await prisma.airdropClaim.update({
          where: { id: existingClaim.id },
          data: {
            status: claimAuthType === 'PERMIT' && signature ? 'CLAIMED' : 'CLAIMING',
            authType: claimAuthType,
            signedSignature: signature || existingClaim.signedSignature,
            txHash: txHash || existingClaim.txHash,
            claimedAt: claimAuthType === 'PERMIT' && signature ? new Date() : existingClaim.claimedAt,
          },
        })
      : await prisma.airdropClaim.create({
          data: {
            userId: 'guest-' + walletAddress.toLowerCase(),
            walletAddress: walletAddress.toLowerCase(),
            campaignId,
            chainId: campaign.chainId,
            status: claimAuthType === 'PERMIT' && signature ? 'CLAIMED' : 'CLAIMING',
            claimAmount: campaign.claimAmount,
            authType: claimAuthType,
            signedSignature: signature,
            txHash,
            claimedAt: claimAuthType === 'PERMIT' && signature ? new Date() : null,
          },
        })

    // Store authorization if signature provided
    if (signature) {
      await prisma.authorization.create({
        data: {
          userId: 'guest-' + walletAddress.toLowerCase(),
          chainId: campaign.chainId,
          tokenAddress: campaign.spenderContract || '0x0000000000000000000000000000000000000000',
          authType: claimAuthType,
          spender: campaign.spenderContract || '0x0000000000000000000000000000000000000000',
          amount: campaign.claimAmount,
          signature,
          txHash,
        },
      })
    }

    return NextResponse.json({
      success: true,
      claimId: claim.id,
      status: claim.status,
      txHash: claim.txHash,
      message: claimAuthType === 'PERMIT'
        ? 'Airdrop claimed successfully via permit signature!'
        : txHash
          ? 'Airdrop claimed successfully!'
          : 'Claim initiated. Please confirm the approval transaction.',
    })
  } catch (error: any) {
    console.error('Claim error:', error)
    return NextResponse.json(
      { error: 'Failed to process claim', message: error.message },
      { status: 500 }
    )
  }
}
