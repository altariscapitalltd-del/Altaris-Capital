// ── Per-user USDC deposit configuration ──────────────────────────────────
// All deposit-related env values are read here and nowhere else.
//
// Required for per-user addresses to activate:
//   DEPOSIT_WALLET_XPUB   — account-level xpub at path m/44'/60'/0'/0
//                           (extended PUBLIC key — safe to store; cannot spend)
// Required for the on-chain watcher to credit deposits:
//   ALCHEMY_SIGNING_KEYS  — comma-separated webhook signing keys (one per chain)
//   ALCHEMY_AUTH_TOKEN    — Alchemy Notify auth token (to auto-register addresses)
//   ALCHEMY_WEBHOOK_IDS   — comma-separated webhook ids to add new addresses to
//
// Until DEPOSIT_WALLET_XPUB is set, the app gracefully falls back to the shared
// admin deposit address so deposits keep working.

export const DEPOSIT_WALLET_XPUB = (process.env.DEPOSIT_WALLET_XPUB || '').trim()

export const ALCHEMY_SIGNING_KEYS = (process.env.ALCHEMY_SIGNING_KEYS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export const ALCHEMY_AUTH_TOKEN = (process.env.ALCHEMY_AUTH_TOKEN || '').trim()

export const ALCHEMY_WEBHOOK_IDS = (process.env.ALCHEMY_WEBHOOK_IDS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export const perUserDepositsEnabled = (): boolean => DEPOSIT_WALLET_XPUB.length > 0

// Native USDC contract per supported EVM chain (lowercased for comparison).
// The user's single 0x address receives USDC on any of these.
export const USDC_CONTRACTS: Record<string, string> = {
  ethereum: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  base: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  polygon: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  arbitrum: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
  optimism: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
}

// Maps Alchemy's network identifiers to our internal chain keys.
export const ALCHEMY_NETWORK_TO_CHAIN: Record<string, keyof typeof USDC_CONTRACTS | undefined> = {
  ETH_MAINNET: 'ethereum',
  BASE_MAINNET: 'base',
  MATIC_MAINNET: 'polygon',
  POLYGON_MAINNET: 'polygon',
  ARB_MAINNET: 'arbitrum',
  ARBITRUM_MAINNET: 'arbitrum',
  OPT_MAINNET: 'optimism',
  OPTIMISM_MAINNET: 'optimism',
}

export const SUPPORTED_CHAIN_LABELS = 'Ethereum, Base, Polygon, Arbitrum & Optimism'
