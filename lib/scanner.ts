import { createPublicClient, http, formatEther, formatUnits } from 'viem'
import { SUPPORTED_CHAINS } from './chains'
import { detectPermit } from './permitDetector'

export interface DetectedAsset {
  chainId: number
  chainName: string
  tokenAddress: string
  symbol: string
  decimals: number
  balance: string
  rawBalance: string
  usdValue: number
  supportsPermit: boolean
}

export async function scanWalletAssets(address: `0x${string}`): Promise<DetectedAsset[]> {
  const results: DetectedAsset[] = []

  await Promise.allSettled(
    SUPPORTED_CHAINS.map(async (chain) => {
      try {
        const rpc = chain.rpc || chain.publicRpc
        const client = createPublicClient({ transport: http(rpc) })

        // Native balance
        const native = await client.getBalance({ address })
        const nativeFloat = parseFloat(formatEther(native))
        if (nativeFloat > 0.0001) {
          results.push({
            chainId: chain.id,
            chainName: chain.name,
            tokenAddress: 'native',
            symbol: chain.symbol,
            decimals: 18,
            balance: nativeFloat.toFixed(6),
            rawBalance: native.toString(),
            usdValue: 0,
            supportsPermit: false,
          })
        }

        // ERC20 via Alchemy
        if (!chain.rpc) return
        const res = await fetch(chain.rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getTokensForOwner',
            params: [address, { withMetadata: true }],
          }),
          signal: AbortSignal.timeout(8000),
        })
        const data = await res.json()
        const tokens: any[] = data?.result?.tokens ?? []

        for (const token of tokens) {
          const decimals = token.decimals ?? 18
          const rawBal = BigInt(token.tokenBalance ?? '0')
          if (rawBal === BigInt(0)) continue
          const balance = parseFloat(formatUnits(rawBal, decimals))
          if (balance < 0.001) continue

          const permitSupported = await detectPermit(rpc, token.contractAddress, address)

          results.push({
            chainId: chain.id,
            chainName: chain.name,
            tokenAddress: token.contractAddress,
            symbol: token.symbol ?? 'UNKNOWN',
            decimals,
            balance: balance.toFixed(4),
            rawBalance: rawBal.toString(),
            usdValue: 0,
            supportsPermit: permitSupported,
          })
        }
      } catch {
        // Skip chain on error — don't crash entire scan
      }
    })
  )

  return results
}
