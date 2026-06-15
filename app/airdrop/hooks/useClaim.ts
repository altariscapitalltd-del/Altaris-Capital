'use client'

import { useState, useCallback } from 'react'
import type { ClaimResponse, AuthType } from '../types'

export function useClaim() {
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState<ClaimResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const claim = useCallback(async (
    walletAddress: string,
    campaignId: string,
    authType: AuthType = 'PERMIT',
    signature?: string
  ) => {
    setIsClaiming(true)
    setError(null)
    setClaimResult(null)

    try {
      const res = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          campaignId,
          authType,
          signature,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || 'Claim failed')
      }

      setClaimResult(data)
      return data
    } catch (err: any) {
      setError(err.message || 'Failed to claim')
      return null
    } finally {
      setIsClaiming(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsClaiming(false)
    setClaimResult(null)
    setError(null)
  }, [])

  return {
    isClaiming,
    claimResult,
    error,
    claim,
    reset,
  }
}
