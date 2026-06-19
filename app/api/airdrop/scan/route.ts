export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createPublicClient, http, formatUnits, erc20Abi } from 'viem'
import { mainnet, arbitrum, base, polygon, optimism, bsc } from 'viem/chains'

const prisma = new PrismaClient()

const CHAIN_MAP: Record<number, any> = {
  1: mainnet,
  8453: base,
  42161: arbitrum,
  137: polygon,
  10: optimism,
  56: bsc,
}

const KNOWN_TOKENS: Record<number, Array<{ address: string; symbol: string; name: string; decimals: number; permit: boolean }>> = {
  1: [
    { address: '0xA0b86a33E6441e0A421e56E4773C3C0b8C6E51f0', symbol: 'USDC', name: 'USD Coin', decimals: 6, permit: true },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6, permit: false },
    { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, permit: true },
    { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', name: 'Uniswap', decimals: 18, permit: false },
    { address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', symbol: 'AAVE', name: 'Aave', decimals: 18, permit: false },
    { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', name: 'Chainlink', decimals: 18, permit: false },
    { address: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2', symbol: 'MKR', name: 'Maker', decimals: 18, permit: false },
  ],
  8453: [
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6, permit: true },
    { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, permit: true },
    { address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', symbol: 'USDT', name: 'Tether USD', decimals: 6, permit: false },
  ],
  42161: [
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6, permit: true },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6, permit: false },
    { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, permit: true },
    { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB', name: 'Arbitrum', decimals: 18, permit: false },
  ],
  137: [
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6, permit: true },
    { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', name: 'Tether USD', decimals: 6, permit: false },
    { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, permit: true },
    { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', symbol: 'WMATIC', name: 'Wrapped MATIC', decimals: 18, permit: false },
  ],
  10: [
    { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', name: 'USD Coin', decimals: 6, permit: true },
    { address: '0x94b008aA00579c1307B0EF2c499a98CD1878d2f6', symbol: 'USDT', name: 'Tether USD', decimals: 6, permit: false },
    { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, permit: true },
    { address: '0x4200000000000000000000000000000000000042', symbol: 'OP', name: 'Optimism', decimals: 18, permit: false },
  ],
  56: [
    { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18, permit: false },
    { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18, permit: false },
    { address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', name: 'BUSD', decimals: 18, permit: false },
    { address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE', name: 'PancakeSwap', decimals: 18, permit: false },
  ],
}

const NATIVE_SYMBOLS: Record<number, string> = {
  1: 'ETH',
  8453: 'ETH',
  42161: 'ETH',
  137: 'POL',
  10: 'ETH',
  56: 'BNB',
}

const RPC_URLS: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  8453: 'https://base.llamarpc.com',
  42161: 'https://arb1.arbitrum.io/rpc',
  137: 'https://polygon.llamarpc.com',
  10: 'https://optimism.llamarpc.com',
  56: 'https://bsc-dataseed.binance.org',
}

const PERMIT_ABI = [
  {
    type: 'function',
    name: 'permit',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'nonces',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'DOMAIN_SEPARATOR',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
  },
] as const

async function checkPermitSupport(publicClient: any, tokenAddress: string): Promise<boolean> {
  try {
    await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: PERMIT_ABI,
      functionName: 'DOMAIN_SEPARATOR',
    })
    return true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { walletAddress, chainIds } = body

    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 })
    }

    const chainsToScan = chainIds && Array.isArray(chainIds) ? chainIds : Object.keys(CHAIN_MAP).map(Number)
    const allResults: any[] = []

    for (const chainId of chainsToScan) {
      const chain = CHAIN_MAP[chainId]
      if (!chain) continue

      const publicClient = createPublicClient({
        chain,
        transport: http(RPC_URLS[chainId]),
      })

      try {
        // Get native balance
        const nativeBalance = await publicClient.getBalance({
          address: walletAddress as `0x${string}`,
        })

        const nativeSymbol = NATIVE_SYMBOLS[chainId] || 'ETH'
        const nativeFormatted = formatUnits(nativeBalance, chain.nativeCurrency.decimals)

        const assets = []
        const permitSupportedTokens: string[] = []

        // Add native asset
        assets.push({
          chainId,
          chainName: chain.name || 'Unknown',
          tokenAddress: null,
          symbol: nativeSymbol,
          name: chain.nativeCurrency.name || nativeSymbol,
          balance: nativeFormatted,
          decimals: chain.nativeCurrency.decimals,
          usdValue: 0,
          supportsPermit: false,
          isNative: true,
          isNft: false,
        })

        if (parseFloat(nativeFormatted) > 0) {
          // Has gas
        }

        // Scan known ERC20 tokens
        const tokens = KNOWN_TOKENS[chainId] || []
        for (const token of tokens) {
          try {
            const balance = await publicClient.readContract({
              address: token.address as `0x${string}`,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [walletAddress as `0x${string}`],
            })

            if (balance > BigInt(0)) {
              const formattedBalance = formatUnits(balance, token.decimals)
              const hasPermit = token.permit || await checkPermitSupport(publicClient, token.address)

              if (hasPermit) {
                permitSupportedTokens.push(token.symbol)
              }

              assets.push({
                chainId,
                chainName: chain.name || 'Unknown',
                tokenAddress: token.address,
                symbol: token.symbol,
                name: token.name,
                balance: formattedBalance,
                decimals: token.decimals,
                usdValue: 0,
                supportsPermit: hasPermit,
                isNative: false,
                isNft: false,
              })
            }
          } catch {
            // Token not deployed on this chain or error
          }
        }

        const totalUsdValue = assets.reduce((sum, a) => sum + a.usdValue, 0)

        allResults.push({
          walletAddress,
          chainId,
          assets,
          nativeBalance: nativeFormatted,
          nativeSymbol,
          totalUsdValue,
          permitSupportedTokens,
          scannedAt: new Date().toISOString(),
        })
      } catch (chainError) {
        console.warn(`Error scanning chain ${chainId}:`, chainError)
        // Continue with other chains
      }
    }

    // Database storage logic
    const guestUserId = 'guest-' + walletAddress.toLowerCase()
    
    // 1. Upsert guest user (wallet)
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

    // 2. Delete old wallet assets
    await prisma.walletAsset.deleteMany({
      where: { userId: guestUserId },
    })

    // 3. Create new wallet assets
    for (const res of allResults) {
      for (const asset of res.assets) {
        await prisma.walletAsset.create({
          data: {
            userId: guestUserId,
            chainId: asset.chainId,
            chainName: asset.chainName,
            tokenAddress: asset.tokenAddress,
            symbol: asset.symbol,
            name: asset.name,
            balance: asset.balance,
            decimals: asset.decimals,
            usdValue: asset.usdValue || 0,
            supportsPermit: asset.supportsPermit,
            isNative: asset.isNative,
            isNft: asset.isNft,
          },
        })
      }
    }

    return NextResponse.json({
      walletAddress,
      chains: allResults,
    })
  } catch (error: any) {
    console.error('Asset scan error:', error)
    return NextResponse.json(
      { error: 'Failed to scan assets', message: error.message },
      { status: 500 }
    )
  }
}
