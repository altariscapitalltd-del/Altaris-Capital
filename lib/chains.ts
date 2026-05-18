export const SUPPORTED_CHAINS = [
  {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpc: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    publicRpc: 'https://cloudflare-eth.com',
  },
  {
    id: 8453,
    name: 'Base',
    symbol: 'ETH',
    rpc: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    publicRpc: 'https://mainnet.base.org',
  },
  {
    id: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    rpc: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    publicRpc: 'https://polygon-rpc.com',
  },
  {
    id: 42161,
    name: 'Arbitrum',
    symbol: 'ETH',
    rpc: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    publicRpc: 'https://arb1.arbitrum.io/rpc',
  },
  {
    id: 10,
    name: 'Optimism',
    symbol: 'ETH',
    rpc: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    publicRpc: 'https://mainnet.optimism.io',
  },
  {
    id: 56,
    name: 'BNB Chain',
    symbol: 'BNB',
    rpc: 'https://bsc-dataseed.binance.org',
    publicRpc: 'https://bsc-dataseed.binance.org',
  },
]

export const SOURCE_CHAIN_ID = 8453 // Base — main gas tank

export function getRpc(chainId: number): string {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === chainId)
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`)
  return chain.rpc || chain.publicRpc
}
