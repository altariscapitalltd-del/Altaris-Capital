export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// One-time endpoint: deletes all airdrop campaigns with placeholder/fake contract addresses
// Safe to call multiple times. Admin-only.
export async function DELETE(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await prisma.airdropCampaign.deleteMany({
    where: {
      OR: [
        { spenderContract: { startsWith: '0x123456' } },
        { spenderContract: { startsWith: '0x234567' } },
        { spenderContract: { startsWith: '0x345678' } },
        { spenderContract: { startsWith: '0x456789' } },
        { spenderContract: { startsWith: '0x567890' } },
        { spenderContract: { startsWith: '0x678901' } },
        { airdropContract: { startsWith: '0xabcdef' } },
        { airdropContract: { startsWith: '0xbcdef' } },
        { airdropContract: { startsWith: '0xcdef' } },
        { airdropContract: { startsWith: '0xdef' } },
        { airdropContract: { startsWith: '0xefab' } },
        { airdropContract: { startsWith: '0xfabc' } },
      ],
    },
  })

  return NextResponse.json({
    deleted: result.count,
    message: `Deleted ${result.count} seeded placeholder campaigns`,
  })
}
