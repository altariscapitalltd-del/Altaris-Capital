import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaigns = await prisma.campaign.findMany({
    where: { isActive: true, endDate: { gte: new Date() } },
    include: { progresses: { where: { userId: user.id } } },
    orderBy: { endDate: 'asc' },
  })

  return NextResponse.json({
    campaigns: campaigns.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      target: c.target,
      reward: c.reward,
      startDate: c.startDate,
      endDate: c.endDate,
      userCount: c.progresses[0]?.count || 0,
      rewarded: c.progresses[0]?.rewarded || false,
      daysLeft: Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000)),
    })),
  })
}
