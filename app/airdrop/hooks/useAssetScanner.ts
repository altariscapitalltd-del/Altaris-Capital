'use client'

import { useState, useCallback } from 'react'
import type { AssetScanResult } from '../types'

export function useAssetScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState<AssetScanResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const scanAssets = useCallback(async (walletAddress: string, chainIds?: number[]) => {
    setIsScanning(true)
    setError(null)

    try {
      const res = await fetch('/api/airdrop/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, chainIds }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Scan failed')
      }

      const data = await res.json()
      const results: AssetScanResult[] = data.chains || []
      setScanResults(results)
      return results
    } catch (err: any) {
      setError(err.message || 'Failed to scan assets')
      return []
    } finally {
      setIsScanning(false)
    }
  }, [])

  const getAssetsForChain = useCallback((chainId: number) => {
    return scanResults.find(r => r.chainId === chainId)?.assets || []
  }, [scanResults])

  const hasNativeGas = useCallback((chainId: number) => {
    const result = scanResults.find(r => r.chainId === chainId)
    if (!result) return false
    return parseFloat(result.nativeBalance) > 0.0001
  }, [scanResults])

  const hasPermitSupport = useCallback((chainId: number) => {
    const result = scanResults.find(r => r.chainId === chainId)
    if (!result) return false
    return result.permitSupportedTokens.length > 0
  }, [scanResults])

  return {
    isScanning,
    scanResults,
    error,
    scanAssets,
    getAssetsForChain,
    hasNativeGas,
    hasPermitSupport,
  }
}
