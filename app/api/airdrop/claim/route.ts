import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage } from 'viem'
import prisma from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      wallet,
      chainId,
      tokenAddress,
      authType,       // 'permit' | 'approve'
      spender,
      amount,
      deadline,
      signature,      // permit EIP-712 signature
      txHash,         // approve tx hash
      campaignId,
      // Wallet ownership proof
      proofMessage,
      proofSignature,
    } = body

    if (!wallet || !chainId || !tokenAddress || !authType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify wallet ownership via signed message
    if (!proofMessage || !proofSignature) {
      return NextResponse.json({ error: 'Wallet proof required' }, { status: 401 })
    }

    const isValid = await verifyMessage({
      address: wallet as `0x${string}`,
      message: proofMessage,
      signature: proofSignature as `0x${string}`,
    }).catch(() => false)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid wallet signature' }, { status: 401 })
    }

    // Verify the proof message contains the wallet address and is recent
    const expectedPrefix = `Altaris Airdrop Claim: ${wallet.toLowerCase()}`
    if (!proofMessage.toLowerCase().startsWith(expectedPrefix.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid proof message' }, { status: 401 })
    }

    // Check for duplicate claim on this campaign
    if (campaignId) {
      const existing = await prisma.airdropAuthorization.findFirst({
        where: {
          wallet:     wallet.toLowerCase(),
          campaignId,
          status:     { in: ['pending', 'executed'] },
        },
      })
      if (existing) {
        return NextResponse.json({ error: 'Already claimed for this campaign' }, { status: 409 })
      }
    }

    const spenderAddress = process.env.RELAYER_ADDRESS ?? spender

    const auth = await prisma.airdropAuthorization.create({
      data: {
        wallet:       wallet.toLowerCase(),
        chainId:      Number(chainId),
        tokenAddress,
        authType,
        spender:      spenderAddress,
        amount:       String(amount),
        deadline:     deadline ? BigInt(deadline) : null,
        signature:    signature ?? null,
        txHash:       txHash ?? null,
        status:       'pending',
        campaignId:   campaignId ?? null,
      },
    })

    return NextResponse.json({ success: true, authId: auth.id })
  } catch (err) {
    console.error('[airdrop/claim]', err)
    return NextResponse.json({ error: 'Claim submission failed' }, { status: 500 })
  }
}
