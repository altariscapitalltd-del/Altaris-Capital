import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/airdrops - List all airdrops
export async function GET() {
  try {
    const airdrops = await prisma.airdrop.findMany({
      orderBy: [{ status: 'asc' }, { order: 'asc' }],
    })
    return NextResponse.json({ airdrops })
  } catch (error) {
    // Fallback to mock data if DB not available
    return NextResponse.json({
      airdrops: [
        { id: '1', slug: 'altaris-launch', title: 'Altaris Capital Launch Airdrop', token: 'Altaris Token', tokenSymbol: 'ALT', amount: 2500, valueUsd: '$250', status: 'CLAIMABLE', description: 'Early supporter reward for the Altaris Capital platform launch.', eligibility: ['Connect wallet', 'Follow on X', 'Join Discord', 'Refer 1 friend'], endsAt: '2025-06-30T00:00:00.000Z', totalClaimed: 18432, totalSupply: 100000, chain: 'Ethereum', color: '#F2BA0E', icon: '◆', order: 0 },
        { id: '2', slug: 'defi-yield', title: 'DeFi Yield Booster Drop', token: 'Yield Token', tokenSymbol: 'YIELD', amount: 500, valueUsd: '$75', status: 'CLAIMABLE', description: 'Exclusive yield booster tokens for active DeFi investors.', eligibility: ['Hold $100+ in DeFi plan', 'Active for 7+ days', 'Connect wallet'], endsAt: '2025-07-15T00:00:00.000Z', totalClaimed: 8432, totalSupply: 50000, chain: 'Arbitrum', color: '#28A0F0', icon: '📈', order: 1 },
        { id: '3', slug: 'bitcoin-rewards', title: 'Bitcoin Halving Celebration', token: 'Wrapped BTC Rewards', tokenSymbol: 'wBTC', amount: 0.005, valueUsd: '$542', status: 'CLAIMABLE', description: 'Celebrate the Bitcoin halving with exclusive wBTC rewards.', eligibility: ['Deposit $500+', 'Hold BTC in wallet', 'Complete KYC'], endsAt: '2025-07-01T00:00:00.000Z', totalClaimed: 2451, totalSupply: 10000, chain: 'Bitcoin', color: '#F7931A', icon: '₿', order: 2 },
        { id: '4', slug: 'ethereum-staking', title: 'Ethereum Staking Rewards', token: 'Staked ETH', tokenSymbol: 'stETH', amount: 0.15, valueUsd: '$547', status: 'CLAIMABLE', description: 'Staking rewards for Ethereum holders who participate in platform investment plans.', eligibility: ['Stake ETH in plan', 'Hold for 14+ days', 'Connect wallet'], endsAt: '2025-07-30T00:00:00.000Z', totalClaimed: 5621, totalSupply: 20000, chain: 'Ethereum', color: '#627EEA', icon: 'Ξ', order: 3 },
        { id: '5', slug: 'solana-summer', title: 'Solana Summer Airdrop', token: 'Solana Token', tokenSymbol: 'SOL', amount: 2.5, valueUsd: '$495', status: 'UPCOMING', description: 'Summer season SOL rewards for active traders and stakers.', eligibility: ['Hold SOL in wallet', 'Trade SOL on platform', 'Stake $200+'], endsAt: '2025-08-01T00:00:00.000Z', totalClaimed: 0, totalSupply: 25000, chain: 'Solana', color: '#9945FF', icon: '◎', order: 4 },
      ]
    })
  }
}
