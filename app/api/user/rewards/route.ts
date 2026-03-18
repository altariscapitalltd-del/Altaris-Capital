import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildRewardsDashboard } from '@/lib/referrals'

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dashboard = await buildRewardsDashboard(user.id)
  return NextResponse.json(dashboard)
}
