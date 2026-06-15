export type CampaignStatus = 'ACTIVE' | 'UPCOMING' | 'ENDED' | 'PAUSED'
export type ClaimStatus = 'PENDING' | 'ELIGIBLE' | 'CLAIMING' | 'CLAIMED' | 'FAILED' | 'GAS_REQUIRED' | 'NOT_ELIGIBLE'
export type AuthType = 'PERMIT' | 'APPROVE'

export interface DetectedAsset {
  chainId: number
  chainName: string
  tokenAddress: string | null
  symbol: string
  name: string
  balance: string
  decimals: number
  usdValue: number
  supportsPermit: boolean
  isNative: boolean
  isNft: boolean
  logoUrl?: string
}

export interface ChainAirdropCard {
  id: string
  campaignId: string
  chainId: number
  chainName: string
  title: string
  subtitle: string
  description: string
  tags: string[]
  allocation: string
  tokenPrice: string
  yourClaim: string
  requirements: string[]
  status: ClaimStatus
  permitRequired: boolean
  hasPermitSupport: boolean
  hasGas: boolean
  claimButtonText: string
  claimButtonDisabled: boolean
  claimButtonBlurred: boolean
  detectedAssets: DetectedAsset[]
  spenderContract: string | null
  airdropContract: string | null
  createdAt: string
}

export interface EligibilityCheck {
  walletAddress: string
  chainId: number
  hasEligibleAssets: boolean
  hasNativeGas: boolean
  eligibleTokens: string[]
  nativeBalance: string
  minRequired: string
  meetsRequirements: boolean
}

export interface ClaimRequest {
  campaignId: string
  walletAddress: string
  authType: AuthType
  signature?: string
  txHash?: string
}

export interface ClaimResponse {
  success: boolean
  claimId?: string
  status: ClaimStatus
  txHash?: string
  message: string
}

export interface AssetScanResult {
  walletAddress: string
  chainId: number
  assets: DetectedAsset[]
  nativeBalance: string
  nativeSymbol: string
  totalUsdValue: number
  permitSupportedTokens: string[]
  scannedAt: string
}

export interface CampaignFilter {
  status?: CampaignStatus | 'all'
  chainId?: number
  search?: string
}

export interface AirdropStats {
  totalCampaigns: number
  activeCampaigns: number
  totalClaims: number
  totalWallets: number
  totalValueClaimed: string
}
