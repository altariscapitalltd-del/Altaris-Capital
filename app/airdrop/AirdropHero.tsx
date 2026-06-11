'use client'

function WalletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <rect x="2" y="6" width="20" height="15" rx="2.5" />
      <path d="M2 10h20" />
      <circle cx="16" cy="15" r="1.5" fill="currentColor" />
    </svg>
  )
}

export function AirdropHero({
  isConnected,
  address,
  onConnectWallet,
  onManageWallet,
}: {
  isConnected: boolean
  address?: string
  onConnectWallet: () => void
  onManageWallet: () => void
}) {
  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : ''

  return (
    <section
      aria-labelledby="airdrop-hero-title"
      style={{
        margin: '0 16px 20px',
        padding: '28px 22px',
        borderRadius: 24,
        background: 'linear-gradient(135deg, rgba(242,186,14,0.18) 0%, rgba(21,26,33,0.98) 40%, #0a0a0a 100%)',
        border: '1px solid rgba(242,186,14,0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(242,186,14,0.15), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--brand-primary)', marginBottom: 10, textTransform: 'uppercase' }}>Web3 Rewards</div>
        <h1 id="airdrop-hero-title" style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.15, margin: '0 0 8px', letterSpacing: '-0.03em' }}>Claim Your<br />Crypto Airdrops</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 20px', maxWidth: 320 }}>
          Discover and claim premium token airdrops. Connect your wallet to unlock exclusive rewards across Ethereum, Solana, and more.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isConnected ? (
            <button
              type="button"
              onClick={onManageWallet}
              className="pressable"
              aria-label={`Wallet connected: ${address}. Manage wallet.`}
              style={{
                padding: '12px 18px', borderRadius: 14, background: 'var(--success-bg)',
                color: 'var(--success)', fontWeight: 800, fontSize: 14, border: '1px solid rgba(14,203,129,0.25)',
                cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
              {shortAddress}
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnectWallet}
              className="pressable"
              style={{
                padding: '12px 22px', borderRadius: 14, background: 'var(--brand-primary)', color: '#000',
                fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <WalletIcon />
              Connect Wallet
            </button>
          )}
          <button
            type="button"
            onClick={() => document.getElementById('campaigns')?.scrollIntoView({ behavior: 'smooth' })}
            className="pressable"
            style={{
              padding: '12px 22px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)',
              fontWeight: 700, fontSize: 14, border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Browse Airdrops
          </button>
        </div>
      </div>
    </section>
  )
}
