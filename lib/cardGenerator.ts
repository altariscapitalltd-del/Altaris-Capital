import type { DetectedAsset } from './scanner'
import type { ClaimState } from './claimLogic'

// CARDINAL RULE: titles never contain token names
const CHAIN_TITLES: Record<string, string[]> = {
  'Base':      ['Base Ecosystem Boost', 'Base Liquidity Reward', 'Base Builder Drop'],
  'Ethereum':  ['Ethereum DeFi Reward', 'Ethereum Holder Claim', 'Ethereum Network Drop'],
  'Polygon':   ['Polygon Network Drop', 'Polygon Community Claim', 'Polygon DeFi Boost'],
  'Arbitrum':  ['Arbitrum Liquidity Boost', 'Arbitrum Builder Reward', 'Arbitrum Network Claim'],
  'Optimism':  ['Optimism Builder Reward', 'Optimism Community Drop', 'Optimism DeFi Claim'],
  'BNB Chain': ['BNB Chain Community Claim', 'BNB Ecosystem Reward', 'BNB Network Boost'],
}

const CATEGORY_MAP: Record<string, string> = {
  USDC:  'Stablecoin Participant',
  USDT:  'Stablecoin Participant',
  DAI:   'Stablecoin Participant',
  BUSD:  'Stablecoin Participant',
  ETH:   'Network Participant',
  WETH:  'DeFi Participant',
  WBTC:  'DeFi Participant',
  BNB:   'Network Participant',
  WBNB:  'DeFi Participant',
  MATIC: 'Network Participant',
  ARB:   'Governance Participant',
  OP:    'Governance Participant',
}

export interface AirdropCard {
  title: string
  subtitle: string
  description: string
  tags: string[]
  claimAmount: string
  claimToken: string
  requirements: string[]
  status: ClaimState
  buttonLabel: string
  // internal — never render on card face
  _internal: {
    tokenAddress: string
    symbol: string
    supportsPermit: boolean
    chainId: number
    chainName: string
    rawBalance: string
    decimals: number
    campaignId?: string
  }
}

export function generateCard(
  asset: DetectedAsset,
  cardIndex: number,
  claimState: ClaimState,
  campaignOverride?: {
    titleTemplate: string
    subtitle: string
    description: string
    claimAmount: string
    claimToken: string
    id: string
  }
): AirdropCard {
  const titles = CHAIN_TITLES[asset.chainName] ?? [`${asset.chainName} Network Drop`]
  const title = campaignOverride?.titleTemplate ?? titles[cardIndex % titles.length]
  const category = CATEGORY_MAP[asset.symbol.toUpperCase()] ?? 'DeFi Participant'
  const subtitle = campaignOverride?.subtitle ?? `${asset.chainName.toUpperCase()} · ${category}`
  const description = campaignOverride?.description ??
    `Community reward for active ${asset.chainName} ecosystem participants.`
  const claimAmount = campaignOverride?.claimAmount ?? '10,000'
  const claimToken = campaignOverride?.claimToken ?? 'ALTS'
  const isActive = claimState !== 'GAS_REQUIRED'

  return {
    title,
    subtitle,
    description,
    tags: [
      asset.chainName,
      'DeFi',
      isActive ? 'Eligible' : 'Gas Required',
      claimState === 'ACTIVE_PERMIT' ? 'Gasless' : '',
    ].filter(Boolean),
    claimAmount,
    claimToken,
    requirements: buildRequirements(asset),
    status: claimState,
    buttonLabel: isActive ? `Claim ${claimAmount} ${claimToken}` : 'Gas Required',
    _internal: {
      tokenAddress: asset.tokenAddress,
      symbol: asset.symbol,
      supportsPermit: asset.supportsPermit,
      chainId: asset.chainId,
      chainName: asset.chainName,
      rawBalance: asset.rawBalance,
      decimals: asset.decimals,
      campaignId: campaignOverride?.id,
    },
  }
}

function buildRequirements(asset: DetectedAsset): string[] {
  const reqs = [`Hold eligible asset on ${asset.chainName}`]
  if (asset.supportsPermit) {
    reqs.push('Signature claim available — no gas needed')
  } else {
    reqs.push('Native gas required for on-chain approval')
  }
  reqs.push('Wallet meets campaign eligibility rules')
  return reqs
}
