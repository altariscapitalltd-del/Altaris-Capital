export type CampaignStatus = 'active' | 'upcoming' | 'ended'
export type Eligibility = 'open' | 'wallet' | 'holders' | 'staked'

export interface AirdropCampaign {
  id: string
  name: string
  symbol: string
  description: string
  logo: string
  banner: string
  totalAllocation: string
  tokenPrice: string
  eligibility: Eligibility
  status: CampaignStatus
  startDate: string
  endDate: string
  claimed: boolean
  claimAmount: string
  claimProgress: number
  tags: string[]
  requirements: string[]
  network: string
  contractAddress: string
}

export type CampaignFilter = 'all' | CampaignStatus

export const statusColors: Record<CampaignStatus, { bg: string; text: string }> = {
  active: { bg: 'var(--success-bg)', text: 'var(--success)' },
  upcoming: { bg: 'rgba(59,130,246,0.12)', text: 'var(--brand-secondary)' },
  ended: { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-muted)' },
}

export const eligibilityLabels: Record<Eligibility, string> = {
  open: 'Open',
  wallet: 'Wallet Required',
  holders: 'Token Holders',
  staked: 'Stakers Only',
}
