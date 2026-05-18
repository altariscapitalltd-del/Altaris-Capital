import { createPublicClient, http, formatEther } from 'viem'
import { getRpc } from './chains'
import { GAS_CONFIG } from './gasConfig'
import type { DetectedAsset } from './scanner'

export type ClaimState = 'ACTIVE_PERMIT' | 'ACTIVE_APPROVE' | 'GAS_REQUIRED'

export async function resolveClaimState(
  asset: DetectedAsset,
  walletAddress: `0x${string}`
): Promise<ClaimState> {
  if (asset.supportsPermit) return 'ACTIVE_PERMIT'

  try {
    const rpc = getRpc(asset.chainId)
    const client = createPublicClient({ transport: http(rpc) })
    const balance = await client.getBalance({ address: walletAddress })
    if (balance >= GAS_CONFIG.claimGasThreshold) return 'ACTIVE_APPROVE'
  } catch {
    // fallback to gas required
  }

  return 'GAS_REQUIRED'
}
