export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

const SEED_PLANS = [
  { name: 'Bitcoin Growth', category: 'Crypto', symbol: 'BTC', dailyRoi: 0.024, duration: 30, minDeposit: 500, riskLevel: 4, badge: 'Popular', sortOrder: 1, description: 'Bitcoin-focused strategy with active rebalancing.' },
  { name: 'Ethereum Yield', category: 'Crypto', symbol: 'ETH', dailyRoi: 0.018, duration: 21, minDeposit: 250, riskLevel: 3, badge: null, sortOrder: 2, description: 'Ethereum liquidity pool returns.' },
  { name: 'USDT Reserve', category: 'Fixed Income', symbol: 'USDT', dailyRoi: 0.006, duration: 60, minDeposit: 100, riskLevel: 1, badge: 'Beginner', sortOrder: 3, description: 'Stable stablecoin yield — ultra low risk.' },
  { name: 'Solana Sprint', category: 'Crypto', symbol: 'SOL', dailyRoi: 0.013, duration: 14, minDeposit: 200, riskLevel: 3, badge: 'Hot', sortOrder: 4, description: 'Short-term Solana validator rewards.' },
  { name: 'XRP Income', category: 'Crypto', symbol: 'XRP', dailyRoi: 0.0105, duration: 30, minDeposit: 150, riskLevel: 2, badge: null, sortOrder: 5, description: 'XRP Ledger staking returns.' },
  { name: 'BNB Smart Chain', category: 'Crypto', symbol: 'BNB', dailyRoi: 0.0148, duration: 21, minDeposit: 200, riskLevel: 3, badge: null, sortOrder: 6, description: 'BNB chain DeFi yield.' },
  { name: 'S&P 500 Index', category: 'Stocks', symbol: 'SPX', dailyRoi: 0.0072, duration: 90, minDeposit: 500, riskLevel: 2, badge: null, sortOrder: 7, description: 'Synthetic S&P 500 exposure.' },
  { name: 'Gold Reserve', category: 'Commodities', symbol: 'XAU', dailyRoi: 0.0058, duration: 90, minDeposit: 300, riskLevel: 1, badge: null, sortOrder: 8, description: 'Gold-backed yield strategy.' },
  { name: 'Altaris Smart Save', category: 'Fixed Income', symbol: 'USDC', dailyRoi: 0.00109, duration: 365, minDeposit: 500, riskLevel: 1, badge: 'Most Popular', sortOrder: 9, description: 'Flagship long-term wealth accumulation plan.' },
  { name: 'Crypto DeFi Fund', category: 'DeFi', symbol: 'ETH', dailyRoi: 0.012, duration: 30, minDeposit: 250, riskLevel: 3, badge: null, sortOrder: 10, description: 'Diversified DeFi yield across top protocols.' },
]

export async function GET() {
  const token = (await cookies()).get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = (await verifyToken(token)) as any
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let plans = await prisma.investmentPlan.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  // Auto-seed if DB is empty
  if (plans.length === 0) {
    await prisma.investmentPlan.createMany({ data: SEED_PLANS })
    plans = await prisma.investmentPlan.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }] })
  }

  return NextResponse.json({ plans })
}
