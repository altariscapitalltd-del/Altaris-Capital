import { formatUnits } from 'viem'
import { prisma } from './db'

/**
 * Auto-deposit scanner — balance-mirror model, no API keys.
 *
 * For each user wallet it reads the current on-chain balance per asset from
 * public RPC/explorer endpoints, compares to the last value seen (User.onchainSeen),
 * and credits the positive delta to the user's in-app balance (recording a
 * SUCCESS deposit transaction). Withdrawals (negative deltas) only lower the
 * baseline — the app debits those separately. Run it from a cron.
 *
 * NOTE: public endpoints are best-effort/rate-limited. For production scale,
 * point RPC_* at dedicated providers via env.
 */

const RPC = {
  eth: process.env.ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com',
  bsc: process.env.BSC_RPC_URL || 'https://bsc-rpc.publicnode.com',
  sol: process.env.SOL_RPC_URL || 'https://api.mainnet-beta.solana.com',
  xrp: process.env.XRP_RPC_URL || 'https://xrplcluster.com',
}
const TOKENS: Record<string, { contract: string; decimals: number }> = {
  USDT: { contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
  USDC: { contract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
}

async function jsonRpc(url: string, method: string, params: any[]): Promise<any> {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const d = await r.json()
  return d.result
}

async function evmNative(url: string, addr: string): Promise<number> {
  const hex = await jsonRpc(url, 'eth_getBalance', [addr, 'latest'])
  return Number(formatUnits(BigInt(hex || '0x0'), 18))
}
async function erc20(url: string, contract: string, addr: string, decimals: number): Promise<number> {
  const data = '0x70a08231' + addr.toLowerCase().replace('0x', '').padStart(64, '0')
  const hex = await jsonRpc(url, 'eth_call', [{ to: contract, data }, 'latest'])
  return Number(formatUnits(BigInt(hex || '0x0'), decimals))
}
async function btcReceived(addr: string): Promise<number> {
  const r = await fetch(`https://blockstream.info/api/address/${addr}`)
  const d = await r.json()
  return (d?.chain_stats?.funded_txo_sum || 0) / 1e8 // total received, monotonic
}
async function solBalance(addr: string): Promise<number> {
  const r = await jsonRpc(RPC.sol, 'getBalance', [addr])
  return (r?.value || 0) / 1e9
}
async function xrpBalance(addr: string): Promise<number> {
  const r = await fetch(RPC.xrp, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: 'account_info', params: [{ account: addr, ledger_index: 'validated' }] }),
  })
  const d = await r.json()
  const drops = d?.result?.account_data?.Balance
  return drops ? Number(drops) / 1e6 : 0
}

const DUST = 1e-7

async function scanUser(u: any): Promise<number> {
  const seen: Record<string, number> = (u.onchainSeen && typeof u.onchainSeen === 'object') ? { ...u.onchainSeen } : {}
  const probes: Array<{ sym: string; read: () => Promise<number> }> = []

  if (u.walletAddress) {
    probes.push({ sym: 'ETH', read: () => evmNative(RPC.eth, u.walletAddress) })
    probes.push({ sym: 'USDT', read: () => erc20(RPC.eth, TOKENS.USDT.contract, u.walletAddress, TOKENS.USDT.decimals) })
    probes.push({ sym: 'USDC', read: () => erc20(RPC.eth, TOKENS.USDC.contract, u.walletAddress, TOKENS.USDC.decimals) })
    probes.push({ sym: 'BNB', read: () => evmNative(RPC.bsc, u.walletAddress) })
  }
  const cw = u.chainWallets as any
  if (cw?.btc?.address) probes.push({ sym: 'BTC', read: () => btcReceived(cw.btc.address) })
  if (cw?.sol?.address) probes.push({ sym: 'SOL', read: () => solBalance(cw.sol.address) })
  if (cw?.xrp?.address) probes.push({ sym: 'XRP', read: () => xrpBalance(cw.xrp.address) })

  let credited = 0
  const nextSeen = { ...seen }
  for (const p of probes) {
    let bal: number
    try { bal = await p.read() } catch { continue } // skip flaky endpoint this round
    if (!Number.isFinite(bal)) continue
    const prev = seen[p.sym]
    nextSeen[p.sym] = bal
    // First time we see this asset: just record the baseline, never credit.
    if (prev === undefined) continue
    const delta = bal - prev
    if (delta > DUST) {
      await prisma.balance.upsert({
        where: { userId_currency: { userId: u.id, currency: p.sym } },
        update: { amount: { increment: delta } },
        create: { userId: u.id, currency: p.sym, amount: delta },
      })
      await prisma.transaction.create({
        data: { userId: u.id, type: 'DEPOSIT' as any, amount: delta, currency: p.sym, status: 'SUCCESS' as any, note: `Auto-detected ${p.sym} deposit` },
      })
      credited++
    }
  }
  await prisma.user.update({ where: { id: u.id }, data: { onchainSeen: nextSeen as any } })
  return credited
}

export async function scanDeposits(): Promise<{ usersScanned: number; deposits: number }> {
  const users = await prisma.user.findMany({
    where: { OR: [{ walletAddress: { not: null } }] },
    select: { id: true, walletAddress: true, chainWallets: true, onchainSeen: true },
    take: 2000,
  })
  let deposits = 0
  for (const u of users) {
    try { deposits += await scanUser(u) } catch { /* per-user isolation */ }
  }
  return { usersScanned: users.length, deposits }
}
