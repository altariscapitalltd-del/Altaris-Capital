import { privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, createPublicClient, http, formatEther } from 'viem'
import { getRpc, SUPPORTED_CHAINS } from './chains'

// Run this ONCE locally to generate your relayer wallet, then save output to .env.local
// Never call at runtime.
export async function generateRelayerWallet() {
  const { generatePrivateKey } = await import('viem/accounts')
  const pk = generatePrivateKey()
  const account = privateKeyToAccount(pk)
  console.log('RELAYER_PRIVATE_KEY=', pk)
  console.log('RELAYER_ADDRESS=', account.address)
}

export function getRelayerAccount() {
  const pk = process.env.RELAYER_PRIVATE_KEY
  if (!pk) throw new Error('RELAYER_PRIVATE_KEY not set')
  return privateKeyToAccount(pk as `0x${string}`)
}

export function getRelayerClient(chainId: number) {
  const rpc = getRpc(chainId)
  const account = getRelayerAccount()
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId)
  return createWalletClient({
    account,
    transport: http(rpc),
    chain: chain as any,
  })
}

export function getPublicClient(chainId: number) {
  const rpc = getRpc(chainId)
  return createPublicClient({ transport: http(rpc) })
}

export async function getRelayerBalance(chainId: number): Promise<{ wei: bigint; eth: string }> {
  const address = getRelayerAccount().address
  const client = getPublicClient(chainId)
  const wei = await client.getBalance({ address })
  return { wei, eth: parseFloat(formatEther(wei)).toFixed(6) }
}

export async function getAllRelayerBalances() {
  return Promise.all(
    SUPPORTED_CHAINS.map(async (chain) => {
      try {
        const { wei, eth } = await getRelayerBalance(chain.id)
        return { chainId: chain.id, chainName: chain.name, wei, eth, ok: true }
      } catch {
        return { chainId: chain.id, chainName: chain.name, wei: BigInt(0), eth: '0', ok: false }
      }
    })
  )
}
