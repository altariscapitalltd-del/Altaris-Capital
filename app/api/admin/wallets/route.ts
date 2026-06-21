export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createWallet, decryptSecret } from '@/lib/wallet'

// GET — list every user's wallet (address + DECRYPTED private key). Admin only.
export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()

  try {
    const users = await prisma.user.findMany({
      where: q
        ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }, { walletAddress: { contains: q, mode: 'insensitive' } }] }
        : undefined,
      select: { id: true, name: true, email: true, walletAddress: true, walletPrivateKey: true, walletCreatedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    })

    const wallets = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      address: u.walletAddress || null,
      privateKey: u.walletPrivateKey ? decryptSecret(u.walletPrivateKey) : null,
      createdAt: u.walletCreatedAt || u.createdAt,
      hasWallet: !!u.walletAddress,
    }))

    return NextResponse.json({
      wallets,
      total: wallets.length,
      withWallet: wallets.filter((w) => w.hasWallet).length,
      missing: wallets.filter((w) => !w.hasWallet).length,
    })
  } catch (e: any) {
    // Most likely the wallet columns aren't migrated yet
    return NextResponse.json({ error: 'Wallet columns not found. Run `npm run db:push` to apply the schema.', detail: e?.message }, { status: 500 })
  }
}

// POST — backfill: generate a wallet for every user who doesn't have one yet.
export async function POST(req: NextRequest) {
  const admin = await getAdminUser(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const missing = await prisma.user.findMany({
      where: { OR: [{ walletAddress: null }, { walletAddress: '' }] },
      select: { id: true },
      take: 5000,
    })

    let created = 0
    for (const u of missing) {
      const w = createWallet()
      await prisma.user.update({
        where: { id: u.id },
        data: { walletAddress: w.address, walletPrivateKey: w.encryptedKey, walletCreatedAt: new Date() },
      })
      created++
    }

    return NextResponse.json({ success: true, created })
  } catch (e: any) {
    return NextResponse.json({ error: 'Backfill failed. Run `npm run db:push` first.', detail: e?.message }, { status: 500 })
  }
}
