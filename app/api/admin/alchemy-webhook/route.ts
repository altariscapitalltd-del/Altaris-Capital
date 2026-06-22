export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { addAddressesToWebhook, listWebhooks } from '@/lib/alchemy-notify'

export async function GET(req: NextRequest) {
  if (!(await getAdminUser(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const webhooks = await listWebhooks()
  return NextResponse.json({
    ethWebhookId: process.env.ALCHEMY_WEBHOOK_ETH_ID || null,
    bnbWebhookId: process.env.ALCHEMY_WEBHOOK_BNB_ID || null,
    signingKeySet: !!process.env.ALCHEMY_WEBHOOK_SIGNING_KEY,
    authTokenSet: !!process.env.ALCHEMY_AUTH_TOKEN,
    webhooks,
  })
}

// POST { action: "sync" } — push all existing user addresses to the webhook
export async function POST(req: NextRequest) {
  if (!(await getAdminUser(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const users = await prisma.user.findMany({
    where: { walletAddress: { not: null } },
    select: { walletAddress: true },
  })
  const addresses = users.map(u => u.walletAddress!).filter(Boolean)
  await addAddressesToWebhook(addresses)
  return NextResponse.json({ ok: true, synced: addresses.length })
}
