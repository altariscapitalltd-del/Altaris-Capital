import { NextRequest, NextResponse } from 'next/server'
import { scanWalletAssets } from '@/lib/scanner'
import prisma from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }

    const assets = await scanWalletAssets(address as `0x${string}`)

    // Upsert assets to DB
    for (const asset of assets) {
      await prisma.airdropAsset.upsert({
        where: {
          wallet_chainId_tokenAddress: {
            wallet:       address.toLowerCase(),
            chainId:      asset.chainId,
            tokenAddress: asset.tokenAddress,
          },
        },
        update: {
          balance:       asset.balance,
          supportsPermit: asset.supportsPermit,
          scannedAt:     new Date(),
        },
        create: {
          wallet:        address.toLowerCase(),
          chainId:       asset.chainId,
          tokenAddress:  asset.tokenAddress,
          symbol:        asset.symbol,
          balance:       asset.balance,
          supportsPermit: asset.supportsPermit,
        },
      })
    }

    return NextResponse.json({ assets, scanned: assets.length })
  } catch (err) {
    console.error('[airdrop/scan]', err)
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}
