'use client'

import { useState, useEffect, useCallback } from 'react'

export interface AirdropCampaignFromAPI {
  id: string
  chainId: number
  chainName: string
  ecosystemCategory: string
  campaignType: string
  titleTemplate: string
  subtitleTemplate: string
  description: string
  allocation: string
  tokenPrice: string
  claimAmount: string
  requirements: string | string[]
  eligibilityRules: any
  tags: string | string[]
  status: string
  permitRequired: boolean
  spenderContract: string | null
  airdropContract: string | null
  priority: number
  createdAt: string
  updatedAt: string
}

export function useAirdropCampaigns() {
  const [campaigns, setCampaigns] = useState<AirdropCampaignFromAPI[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCampaigns = useCallback(async (status?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (status && status !== 'all') params.set('status', status)

      const res = await fetch(`/api/airdrop/campaigns?${params}`)
      if (!res.ok) throw new Error('Failed to fetch campaigns')

      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load campaigns')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns('ACTIVE')
  }, [fetchCampaigns])

  return {
    campaigns,
    isLoading,
    error,
    fetchCampaigns,
  }
}
