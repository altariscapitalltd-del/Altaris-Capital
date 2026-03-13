import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  const token = (await cookies()).get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = (await verifyToken(token)) as any
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const investments = await prisma.investment.findMany({
    where: { userId: payload.userId },
    orderBy: { startDate: 'desc' }
  })
  return NextResponse.json({ investments })
}

export async function POST(req: Request) {
  const token = (await cookies()).get('token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = (await verifyToken(token)) as any
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId, planName, amount, dailyRoi } = await req.json()
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  // Check balance
  const balance = await prisma.balance.findFirst({ where: { userId: payload.userId, currency: 'USD' } })
  if (!balance || balance.amount < amount) return NextResponse.json({ error: 'Insufficient USD balance' }, { status: 400 })

  // Determine duration from planId
  const DURATIONS: Record<string,number> = {
    'btc-yield':14,'eth-stake':90,'defi-accel':7,'altcoin':30,'btc-micro':60,'web3-venture':20,
    'us-tech':90,'dividend':180,'sp500':120,'blue-chip':90,'ai-stocks':60,
    'reit-us':120,'reit-asia':90,'dev-fund':45,'reit-global':180,
    'us-treasury':365,'corp-bond':180,'hi-yield-bond':120,'em-bond':150,
    'smart-save':365,'stablecoin':60,
    'gold':120,'silver':150,'energy':90,
    'usd-eur':90,'em-fx':45,'asia-fx':60,
    'clean-energy':90,'health-etf':120,
    'global-macro':30,'longshort':30,
  }
  const durationDays = DURATIONS[planId] || 30

  const startDate = new Date()
  const endDate = new Date(startDate.getTime() + durationDays * 86400000)

  const [investment] = await prisma.$transaction([
    prisma.investment.create({
      data: {
        userId: payload.userId,
        planId: planId || 'custom',
        planName: planName || 'Investment Plan',
        amount,
        dailyRoi: dailyRoi || 0.01,
        startDate,
        endDate,
        status: 'ACTIVE',
      }
    }),
    prisma.balance.update({
      where: { id: balance.id },
      data: { amount: { decrement: amount } }
    }),
    prisma.transaction.create({
      data: {
        userId: payload.userId,
        type: 'INVESTMENT',
        currency: 'USD',
        amount,
        status: 'SUCCESS',
        note: `Invested in ${planName}`,
      }
    }),
    prisma.balanceSnapshot.create({
      data: { balanceId: balance.id, amount: balance.amount - amount }
    }),
  ])

  return NextResponse.json({ investment })
}
