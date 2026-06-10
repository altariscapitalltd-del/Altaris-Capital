import { prisma } from '@/lib/db'
import { deriveDepositAddress } from '@/lib/depositWallet'
import { registerDepositAddress } from '@/lib/alchemy'
import { perUserDepositsEnabled } from '@/lib/config/deposits'

export interface ResolvedDepositAddress {
  address: string
  shared: boolean // true => falling back to the shared admin address (xpub not set yet)
}

const PENDING_PREFIX = 'pending-'

// Returns the caller's permanent per-user USDC deposit address, assigning one on
// first request. Falls back to the shared admin USDC address while the platform
// xpub is not yet configured, so deposits keep working during rollout.
export async function getOrCreateDepositAddress(userId: string): Promise<ResolvedDepositAddress | null> {
  if (perUserDepositsEnabled()) {
    const perUser = await assignPerUserAddress(userId)
    if (perUser) return { address: perUser, shared: false }
    // If assignment failed (e.g. malformed xpub), fall through to shared.
  }

  const shared = await prisma.walletAddress.findUnique({ where: { currency: 'USDC' } })
  if (shared?.address) return { address: shared.address, shared: true }
  return null
}

// Look up which user owns a given on-chain address (used by the watcher).
export async function findUserByDepositAddress(address: string): Promise<string | null> {
  const row = await prisma.depositAddress.findFirst({
    where: { address: { equals: address, mode: 'insensitive' } },
    select: { userId: true },
  })
  return row?.userId ?? null
}

async function assignPerUserAddress(userId: string): Promise<string | null> {
  const existing = await prisma.depositAddress.findUnique({ where: { userId } })
  if (existing && !existing.address.startsWith(PENDING_PREFIX)) return existing.address

  // Repair a row that got stuck mid-assignment.
  if (existing) {
    try {
      const address = deriveDepositAddress(existing.index)
      const updated = await prisma.depositAddress.update({ where: { id: existing.id }, data: { address } })
      void registerDepositAddress(address)
      return updated.address
    } catch {
      return null
    }
  }

  // Create a placeholder row to obtain a unique auto-increment index, then derive.
  let createdId: string | null = null
  let createdIndex: number | null = null
  try {
    const created = await prisma.depositAddress.create({
      data: { userId, address: `${PENDING_PREFIX}${userId}` },
    })
    createdId = created.id
    createdIndex = created.index
    const address = deriveDepositAddress(created.index)
    const updated = await prisma.depositAddress.update({ where: { id: created.id }, data: { address } })
    void registerDepositAddress(address)
    return updated.address
  } catch (err) {
    // Concurrent request won the race — return whatever it stored.
    const again = await prisma.depositAddress.findUnique({ where: { userId } })
    if (again && !again.address.startsWith(PENDING_PREFIX)) return again.address
    // Otherwise this was our own failure (e.g. derive threw): clean up the stub.
    if (createdId && createdIndex !== null) {
      await prisma.depositAddress.delete({ where: { id: createdId } }).catch(() => {})
    }
    return null
  }
}
