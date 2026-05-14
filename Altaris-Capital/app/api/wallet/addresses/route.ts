import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Note: this endpoint is used by the client to fetch deposit wallet addresses.
  // It is kept dynamic to avoid build-time database access during `next build`.
  const addresses = await prisma.walletAddress.findMany()
  return NextResponse.json({ addresses })
}
