export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Public (authenticated) endpoint — find an Altaris user by email for internal transfers.
// Returns only safe public fields: id, name, avatarUrl. Never exposes email/keys/balances.
export async function GET(req: NextRequest) {
  const me = await getAuthUser(req)
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = new URL(req.url).searchParams.get('email')?.toLowerCase().trim()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  if (email === me.email?.toLowerCase()) {
    return NextResponse.json({ error: 'Cannot send to yourself' }, { status: 400 })
  }

  const found = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, profilePicture: true, isActive: true },
  })

  if (!found || !found.isActive) {
    return NextResponse.json({ error: 'No Altaris user found with that email' }, { status: 404 })
  }

  return NextResponse.json({ id: found.id, name: found.name, avatarUrl: found.profilePicture || null })
}
