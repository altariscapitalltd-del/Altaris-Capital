import { SUPPORTED_CHAINS, SOURCE_CHAIN_ID } from './chains'
import { getRelayerBalance } from './relayer'
import { GAS_CONFIG } from './gasConfig'
import { triggerGasRefill } from './gasRefill'

export async function checkAllRelayerBalances() {
  const results = []

  for (const chain of SUPPORTED_CHAINS) {
    try {
      const { wei, eth } = await getRelayerBalance(chain.id)
      const needsRefill = chain.id !== SOURCE_CHAIN_ID && wei < GAS_CONFIG.minBalance

      results.push({
        chainId: chain.id,
        chainName: chain.name,
        eth,
        wei: wei.toString(),
        needsRefill,
        isSource: chain.id === SOURCE_CHAIN_ID,
      })

      if (needsRefill) {
        await triggerGasRefill(chain.id).catch((e) =>
          console.error(`Refill failed for chain ${chain.id}:`, e)
        )
      }
    } catch {
      results.push({
        chainId: chain.id,
        chainName: chain.name,
        eth: '0',
        wei: '0',
        needsRefill: false,
        isSource: chain.id === SOURCE_CHAIN_ID,
        error: true,
      })
    }
  }

  return results
}
