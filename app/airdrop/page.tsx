'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { AltarisLogoMark } from '@/components/AltarisLogo'
import { airdropAppkit } from '@/lib/airdrop-reown'

export default function AirdropPage() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      airdropAppkit.open({ view: 'Connect' }).catch(() => {})
    }, 100)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#050608', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 10%, rgba(242,186,14,0.16), transparent 26%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.12), transparent 24%), linear-gradient(180deg, #0a0d12 0%, #050608 100%)' }} />
      <div style={{ position: 'relative', zIndex: 1, padding: 24, maxWidth: 520, margin: '0 auto', minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <AltarisLogoMark size={36} />
            <div>
              <div style={{ fontWeight: 800, letterSpacing: '0.08em' }}>ALTARIS</div>
              <div style={{ color: '#666', fontSize: 11, letterSpacing: '0.16em' }}>AIRDROP</div>
            </div>
          </div>

          <div style={{ padding: 22, borderRadius: 24, background: 'rgba(10,12,16,0.76)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ color: '#F2BA0B', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', marginBottom: 10 }}>CLAIM AIRDROP</div>
            <h1 style={{ fontSize: 30, lineHeight: 1.05, margin: 0 }}>Connect wallet only</h1>
            <p style={{ color: '#8A8F98', marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>
              No social login. Just connect a wallet to check eligibility and claim if approved.
            </p>
            <button onClick={() => airdropAppkit.open({ view: 'Connect' }).catch(() => {})} style={{ width: '100%', marginTop: 18, padding: '15px 16px', borderRadius: 14, border: 'none', background: '#F2BA0B', color: '#000', fontWeight: 900, cursor: 'pointer' }}>
              Connect Wallet
            </button>
            <div style={{ color: '#6A707A', fontSize: 12, textAlign: 'center', marginTop: 12 }}>Wallets only. No social sign-in.</div>
            <div style={{ marginTop: 18 }}>
              <Link href="/" style={{ color: '#ccc', textDecoration: 'none', fontSize: 13 }}>← Back to main site</Link>
            </div>
          </div>
        </div>
      </div>
      {React.createElement('appkit-modal')}
    </div>
  )
}
