import { createPublicClient, http } from 'viem'

const NONCES_ABI = [
  {
    name: 'nonces',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export async function detectPermit(
  rpc: string,
  tokenAddress: string,
  walletAddress: `0x${string}`
): Promise<boolean> {
  try {
    const client = createPublicClient({ transport: http(rpc) })
    await client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: NONCES_ABI,
      functionName: 'nonces',
      args: [walletAddress],
    })
    return true
  } catch {
    return false
  }
}
