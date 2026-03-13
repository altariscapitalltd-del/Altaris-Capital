'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Pusher from 'pusher-js'
import { AltarisLogoMark } from '@/components/AltarisLogo'

const TRENDING = ['🔥 BTC +2.34%', '⚡ ETH +1.78%', '🚀 SOL +5.12%', '📈 Smart Save 40%/yr', '🎁 Claim $100 bonus']

// ── Bybit-exact icons: white when active, #4A4A4A when inactive ──
const NAV = [
  {
    href: '/home', label: 'Home',
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        {a ? (
          // Filled home when active
          <>
            <path d="M12 2.1L2.5 9.4V21a1 1 0 001 1h6v-6h5v6h6a1 1 0 001-1V9.4L12 2.1z" fill="#FFFFFF"/>
          </>
        ) : (
          // Outlined home when inactive
          <>
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke="#4A4A4A" strokeWidth="1.7" strokeLinejoin="round" fill="none"/>
            <path d="M9 21V13h6v8" stroke="#4A4A4A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
          </>
        )}
      </svg>
    ),
  },
  {
    href: '/markets', label: 'Markets',
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        {a ? (
          <>
            <rect x="2" y="14" width="3" height="7" rx="1" fill="#FFFFFF"/>
            <rect x="7" y="9"  width="3" height="12" rx="1" fill="#FFFFFF"/>
            <rect x="12" y="5" width="3" height="16" rx="1" fill="#FFFFFF"/>
            <rect x="17" y="11" width="3" height="10" rx="1" fill="#FFFFFF"/>
            <polyline points="2 10 7 6 12 9 17 4 22 7" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </>
        ) : (
          <>
            <rect x="2" y="14" width="3" height="7" rx="1" fill="none" stroke="#4A4A4A" strokeWidth="1.5"/>
            <rect x="7" y="9"  width="3" height="12" rx="1" fill="none" stroke="#4A4A4A" strokeWidth="1.5"/>
            <rect x="12" y="5" width="3" height="16" rx="1" fill="none" stroke="#4A4A4A" strokeWidth="1.5"/>
            <rect x="17" y="11" width="3" height="10" rx="1" fill="none" stroke="#4A4A4A" strokeWidth="1.5"/>
          </>
        )}
      </svg>
    ),
  },
  {
    href: '/invest', label: 'Invest',
    icon: (a: boolean) => (
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <circle cx="13" cy="13" r="12" fill={a ? '#F2BA0E' : '#1E1E1E'} stroke={a ? '#F2BA0E' : '#3A3A3A'} strokeWidth="1.5"/>
        <path d="M9 13h8M13 9v8" stroke={a ? '#000' : '#5A5A5A'} strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/wallet', label: 'Wallet',
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        {a ? (
          <>
            <rect x="2" y="6" width="20" height="15" rx="2.5" fill="#FFFFFF"/>
            <path d="M2 10h20" stroke="#000" strokeWidth="1.5"/>
            <circle cx="16" cy="15" r="1.5" fill="#000"/>
            <path d="M6 6V5a3 3 0 016 0v1" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
          </>
        ) : (
          <>
            <rect x="2" y="6" width="20" height="15" rx="2.5" stroke="#4A4A4A" strokeWidth="1.7" fill="none"/>
            <path d="M2 10h20M15 15.5a1 1 0 110-2 1 1 0 010 2z" stroke="#4A4A4A" strokeWidth="1.5" fill="none"/>
            <path d="M6 6V5a3 3 0 016 0v1" stroke="#4A4A4A" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          </>
        )}
      </svg>
    ),
  },
  {
    href: '/settings', label: 'Profile',
    icon: (a: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        {a ? (
          <>
            <circle cx="12" cy="7" r="4.5" fill="#FFFFFF"/>
            <path d="M3 21c0-4 4-7 9-7s9 3 9 7" fill="#FFFFFF"/>
          </>
        ) : (
          <>
            <circle cx="12" cy="7" r="4" stroke="#4A4A4A" strokeWidth="1.7"/>
            <path d="M4 21c0-3.8 3.6-6.5 8-6.5s8 2.7 8 6.5" stroke="#4A4A4A" strokeWidth="1.7" strokeLinecap="round"/>
          </>
        )}
      </svg>
    ),
  },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [user, setUser]               = useState<any>(null)
  const [unread, setUnread]           = useState(0)
  const [bonusUnclaimed, setBonusUnclaimed] = useState(false)
  const [tickerIdx, setTickerIdx]     = useState(0)

  useEffect(() => {
    fetch('/api/auth/me').then(r => {
      if (!r.ok) { router.push('/login'); return null }
      return r.json()
    }).then(d => {
      if (d) { setUser(d.user); setBonusUnclaimed(!d.user?.bonusClaimed) }
    }).catch(() => router.push('/login'))
  }, [])

  useEffect(() => {
    if (!user?.id) return

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
      authEndpoint: '/api/pusher/auth',
    })

    const channel = pusher.subscribe(`private-user-${user.id}`)

    channel.bind('notification:new', () => setUnread(n => n + 1))
    channel.bind('balance:update', () => window.dispatchEvent(new Event('balance:refresh')))

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`private-user-${user.id}`)
      pusher.disconnect()
    }
  }, [user?.id])

  useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i + 1) % TRENDING.length), 3000)
    return () => clearInterval(t)
  }, [])

  const activeTab = NAV.find(n =>
    pathname === n.href || (n.href !== '/home' && pathname.startsWith(n.href))
  )?.href || '/home'

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top Bar — Bybit exact ── */}
      <header style={{
        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--bg-page)', position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Avatar with gold ring */}
        <Link href="/profile" style={{ flexShrink: 0, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg,#F2BA0E,#FF9500)',
            border: '2px solid rgba(242,186,14,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, color: '#000', overflow: 'hidden', flexShrink: 0,
          }}>
            {user?.profilePicture
              ? <img src={user.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (user?.name?.[0]?.toUpperCase() || 'A')}
          </div>
        </Link>

        {/* Search pill — live trending ticker */}
        <Link href="/markets" style={{ flex: 1, textDecoration: 'none' }}>
          <div style={{
            background: '#1A1A1A', borderRadius: 99, padding: '9px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#4A4A4A" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round"/>
            </svg>
            <span key={tickerIdx} style={{ color: '#6A6A6A', fontSize: 12, fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', animation: 'fadeIn .3s ease' }}>
              {TRENDING[tickerIdx]}
            </span>
          </div>
        </Link>

        {/* Right icon cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Scan / QR */}
          <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: '#1A1A1A' }}>
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="#7A7A7A" strokeWidth="2" strokeLinecap="round">
              <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
              <rect x="7" y="7" width="4" height="4" rx="0.5"/><rect x="13" y="7" width="4" height="4" rx="0.5"/>
              <rect x="7" y="13" width="4" height="4" rx="0.5"/><path d="M13 13h4v4"/>
            </svg>
          </div>
          {/* Gift / Bonus */}
          <Link href="/home" style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', borderRadius: 10, background: '#1A1A1A' }}>
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="#7A7A7A" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="8" width="18" height="13" rx="2"/>
              <path d="M12 8V21M3 13h18M7.5 8A2.5 2.5 0 0112 5.5M16.5 8A2.5 2.5 0 0012 5.5"/>
            </svg>
            {bonusUnclaimed && (
              <div style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#F6465D', border: '1.5px solid #000' }} />
            )}
          </Link>
          {/* Notification bell */}
          <Link href="/settings" style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', borderRadius: 10, background: '#1A1A1A' }}>
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="#7A7A7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {unread > 0 && (
              <div style={{
                position: 'absolute', top: 5, right: 5,
                minWidth: 16, height: 16, borderRadius: 99,
                background: '#F6465D', border: '1.5px solid #000',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8, fontWeight: 800, color: '#fff', padding: '0 3px',
              }}>
                {unread > 9 ? '9+' : unread}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {children}
      </main>

      {/* ── Bottom Navigation — curved top, Bybit exact ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        /* Curved top corners — the key to the Bybit feel */
        borderRadius: '20px 20px 0 0',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', height: 62 }}>
          {NAV.map(({ href, label, icon }) => {
            const active = activeTab === href
            return (
              <Link
                key={href} href={href}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 4, textDecoration: 'none',
                  position: 'relative',
                  transition: 'opacity .1s',
                }}
              >
                {/* Active top indicator dot — Bybit style */}
                {active && href === '/invest' ? null : active && (
                  <div style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: 20, height: 2.5, borderRadius: '0 0 3px 3px',
                    background: '#FFFFFF',
                  }} />
                )}
                {icon(active)}
                <span style={{
                  fontSize: 10,
                  fontWeight: active ? 600 : 400,
                  color: active
                    ? (href === '/invest' ? '#F2BA0E' : '#FFFFFF')
                    : '#4A4A4A',
                  transition: 'color .15s',
                  letterSpacing: '0.01em',
                }}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
