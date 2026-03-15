'use client'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AltarisLogoMark } from '@/components/AltarisLogo'

type PendingCounts = {
  deposits: number
  kyc: number
  withdrawals: number
  chat: number
}

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/deposits', label: 'Deposits' },
  { href: '/admin/withdrawals', label: 'Withdrawals' },
  { href: '/admin/kyc', label: 'KYC Review' },
  { href: '/admin/chat', label: 'Support' },
  { href: '/admin/notifications', label: 'Broadcast' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/audit', label: 'Audit Logs' },
  { href: '/admin/settings', label: 'Settings' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ deposits: 0, kyc: 0, withdrawals: 0, chat: 0 })

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (pathname === '/admin/login') return
    let cancelled = false

    const load = () => {
      fetch('/api/admin/dashboard')
        .then((r) => {
          if (r.status === 401) {
            router.push('/admin/login')
            return null
          }
          return r.json()
        })
        .then((d) => {
          if (cancelled || !d?.stats) return
          setPendingCounts({
            deposits: d.stats.pendingDeposits || 0,
            kyc: d.stats.pendingKyc || 0,
            withdrawals: d.stats.pendingWithdrawals || 0,
            chat: 0,
          })
        })
        .catch(() => {
          if (!cancelled) router.push('/admin/login')
        })
    }

    load()
    const interval = window.setInterval(load, 15000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [pathname, router])

  const badges = useMemo(
    () => ({
      '/admin/deposits': pendingCounts.deposits,
      '/admin/kyc': pendingCounts.kyc,
      '/admin/withdrawals': pendingCounts.withdrawals,
      '/admin/chat': pendingCounts.chat,
    }),
    [pendingCounts]
  )

  if (pathname === '/admin/login') return <>{children}</>

  const shellStyle: React.CSSProperties = {
    display: 'flex',
    minHeight: '100vh',
    background: 'radial-gradient(circle at top right, rgba(242,186,14,0.1), transparent 40%), #070707',
    color: '#fff',
    fontFamily: 'Inter,-apple-system,sans-serif',
  }

  return (
    <div style={shellStyle}>
      {isMobile && mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} />
      )}

      <aside
        style={{
          width: collapsed ? 82 : 260,
          background: 'rgba(13,13,13,0.94)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(14px)',
          display: 'flex',
          flexDirection: 'column',
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 60,
          transform: isMobile && !mobileMenuOpen ? 'translateX(-105%)' : 'translateX(0)',
          transition: 'transform .22s ease',
        }}
      >
        <div style={{ padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AltarisLogoMark size={26} />
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 900, letterSpacing: '.06em', fontSize: 12 }}>ALTARIS ADMIN</div>
              <div style={{ color: '#7A7A7A', fontSize: 10 }}>Control Center</div>
            </div>
          )}
        </div>

        <nav style={{ padding: 12, display: 'grid', gap: 8, overflowY: 'auto' }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const badge = badges[item.href as keyof typeof badges]
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'space-between',
                  padding: collapsed ? '12px 10px' : '12px 14px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  border: active ? '1px solid rgba(242,186,14,0.5)' : '1px solid transparent',
                  background: active ? 'linear-gradient(90deg, rgba(242,186,14,0.16), rgba(242,186,14,0.05))' : 'transparent',
                  color: active ? '#F2BA0E' : '#C8C8C8',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {!collapsed && <span>{item.label}</span>}
                {collapsed && <span style={{ fontSize: 11 }}>{item.label.slice(0, 2).toUpperCase()}</span>}
                {!!badge && !collapsed && (
                  <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: '#F6465D', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div style={{ marginTop: 'auto', padding: 12 }}>
          <button onClick={() => setCollapsed((v) => !v)} style={{ width: '100%', border: '1px solid rgba(255,255,255,0.12)', background: '#0f0f0f', color: '#E1E1E1', borderRadius: 10, padding: '10px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>
        <header style={{ position: 'sticky', top: 0, zIndex: 40, backdropFilter: 'blur(10px)', background: 'rgba(7,7,7,0.75)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMobile && (
              <button onClick={() => setMobileMenuOpen((v) => !v)} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: '#111', color: '#fff', fontSize: 18, cursor: 'pointer' }}>
                ☰
              </button>
            )}
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Admin Workspace</div>
              <div style={{ color: '#8A8A8A', fontSize: 11 }}>Premium operations panel</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#9A9A9A' }}>Pending</span>
            <span style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(242,186,14,0.15)', border: '1px solid rgba(242,186,14,0.35)', color: '#F2BA0E', fontWeight: 800, fontSize: 12 }}>
              {pendingCounts.deposits + pendingCounts.kyc + pendingCounts.withdrawals}
            </span>
          </div>
        </header>

        <div style={{ padding: isMobile ? 12 : 20 }}>{children}</div>
      </main>
    </div>
  )
}
