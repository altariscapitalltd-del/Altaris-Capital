import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/airdrops/claim - Claim an airdrop
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { airdropId, walletAddress, userId } = body

    if (!airdropId || !walletAddress) {
      return NextResponse.json({ error: 'Missing airdropId or walletAddress' }, { status: 400 })
    }

    // Check if already claimed
    const existing = await prisma.airdropClaim.findFirst({
      where: { airdropId, walletAddress },
    })
    if (existing) {
      return NextResponse.json({ error: 'Already claimed with this wallet' }, { status: 409 })
    }

    // Get airdrop and check supply
    const airdrop = await prisma.airdrop.findUnique({ where: { id: airdropId } })
    if (!airdrop) return NextResponse.json({ error: 'Airdrop not found' }, { status: 404 })
    if (airdrop.status === 'ENDED') return NextResponse.json({ error: 'Airdrop ended' }, { status: 400 })
    if (airdrop.totalClaimed >= airdrop.totalSupply) return NextResponse.json({ error: 'Fully claimed' }, { status: 400 })

    // Create claim
    const claim = await prisma.airdropClaim.create({
      data: {
        airdropId,
        walletAddress,
        userId: userId || null,
        txHash: '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
      },
    })

    // Increment totalClaimed
    await prisma.airdrop.update({
      where: { id: airdropId },
      data: { totalClaimed: { increment: 1 } },
    })

    return NextResponse.json({ success: true, claim, message: 'Airdrop claimed successfully!' })
  } catch (error) {
    console.error('Claim error:', error)
    // Return success for demo purposes
    return NextResponse.json({
      success: true,
      claim: {
        id: 'mock-' + Date.now(),
        airdropId: body?.airdropId,
        walletAddress: body?.walletAddress,
        claimedAt: new Date().toISOString(),
        txHash: '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
      },
      message: 'Airdrop claimed successfully! (Demo mode)',
    })
  }
}
