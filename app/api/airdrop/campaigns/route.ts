import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const campaigns = await prisma.airdropCampaign.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ campaigns })
  } catch (err) {
    console.error('[airdrop/campaigns]', err)
    return NextResponse.json({ error: 'Failed to load campaigns' }, { status: 500 })
  }
}
