export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createWallet, createChainWallets, decryptSecret } from '@/lib/wallet'

function decryptChains(cw: any) {
  if (!cw || typeof cw !== 'object') return null
  const out: any = {}
  for (const k of ['btc', 'sol', 'xrp']) {
    if (cw[k]?.address) out[k] = { address: cw[k].address, privateKey: cw[k].encryptedKey ? decryptSecret(cw[k].encryptedKey) : null }
  }
  return out
}

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
      select: { id: true, name: true, email: true, walletAddress: true, walletPrivateKey: true, chainWallets: true, walletCreatedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    })

    const wallets = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      address: u.walletAddress || null,
      privateKey: u.walletPrivateKey ? decryptSecret(u.walletPrivateKey) : null,
      chains: decryptChains(u.chainWallets),
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
    // Users missing the EVM wallet OR the native chain wallets
    const all = await prisma.user.findMany({
      select: { id: true, walletAddress: true, chainWallets: true },
      take: 5000,
    })
    const missing = all.filter((u) => !u.walletAddress || !u.chainWallets)

    let created = 0
    for (const u of missing) {
      const data: any = {}
      if (!u.walletAddress) {
        const w = createWallet()
        data.walletAddress = w.address
        data.walletPrivateKey = w.encryptedKey
        data.walletCreatedAt = new Date()
      }
      if (!u.chainWallets) data.chainWallets = createChainWallets() as any
      if (Object.keys(data).length) {
        await prisma.user.update({ where: { id: u.id }, data })
        created++
      }
    }

    return NextResponse.json({ success: true, created })
  } catch (e: any) {
    return NextResponse.json({ error: 'Backfill failed. Run `npm run db:push` first.', detail: e?.message }, { status: 500 })
  }
}
