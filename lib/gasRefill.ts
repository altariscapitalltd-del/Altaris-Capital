import { GAS_CONFIG, SOURCE_CHAIN_ID } from './gasConfig'
import { getRelayerAccount, getRelayerClient } from './relayer'
import prisma from './db'

export async function triggerGasRefill(targetChainId: number) {
  if (targetChainId === SOURCE_CHAIN_ID) return

  const relayerAddress = getRelayerAccount().address
  const NATIVE = '0x0000000000000000000000000000000000000000'

  // Get best route from LiFi
  const params = new URLSearchParams({
    fromChain:   String(SOURCE_CHAIN_ID),
    toChain:     String(targetChainId),
    fromToken:   NATIVE,
    toToken:     NATIVE,
    fromAmount:  String(GAS_CONFIG.refillAmount),
    fromAddress: relayerAddress,
    toAddress:   relayerAddress,
  })

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.LIFI_API_KEY) headers['x-lifi-api-key'] = process.env.LIFI_API_KEY

  const quoteRes = await fetch(`https://li.quest/v1/quote?${params}`, { headers })
  const quote = await quoteRes.json()

  if (!quote?.transactionRequest?.to) {
    console.error('LiFi: no route found for chain', targetChainId, quote)
    return
  }

  const client = getRelayerClient(SOURCE_CHAIN_ID)
  const txHash = await (client as any).sendTransaction({
    to:    quote.transactionRequest.to as `0x${string}`,
    data:  quote.transactionRequest.data as `0x${string}`,
    value: BigInt(quote.transactionRequest.value ?? '0'),
    gas:   BigInt(quote.transactionRequest.gasLimit ?? '200000'),
  })

  await prisma.airdropGasRefill.create({
    data: {
      fromChainId: SOURCE_CHAIN_ID,
      toChainId:   targetChainId,
      amount:      String(GAS_CONFIG.refillAmount),
      txHash,
      status:      'pending',
    },
  })

  console.log(`[gas-refill] chain ${targetChainId} | tx ${txHash}`)
  return txHash
}
