'use client'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Pusher from 'pusher-js'
import { AltarisLogoMark } from '@/components/AltarisLogo'

type PendingCounts = {
  deposits: number
  kyc: number
  withdrawals: number
  chat: number
}

const NAV_ITEMS = [
  { href:'/admin/dashboard', label:'Overview', icon:(a:boolean)=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>)},
  { href:'/admin/users', label:'Users', icon:(a:boolean)=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8"><circle cx="9" cy="7" r="4"/><path d="M2 21c0-4 3.1-6 7-6" strokeLinecap="round"/><circle cx="17" cy="11" r="3"/><path d="M14 21c0-2.8 1.3-4 3-4s3 1.2 3 4" strokeLinecap="round"/></svg>)},
  { href:'/admin/deposits', label:'Deposits', icon:(a:boolean)=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8"><path d="M12 3v14M7 13l5 5 5-5" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 19h16" strokeLinecap="round"/></svg>)},
  { href:'/admin/kyc', label:'KYC Review', icon:(a:boolean)=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5 18c0-2 1.8-3 4-3s4 1 4 3" strokeLinecap="round"/><path d="M16 9h2M16 13h2" strokeLinecap="round"/></svg>)},
  { href:'/admin/chat', label:'Support', icon:(a:boolean)=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>)},
  { href:'/admin/notifications', label:'Broadcast', icon:(a:boolean)=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round"/></svg>)},
  { href:'/admin/settings', label:'Settings', icon:(a:boolean)=>(<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?'#F2BA0E':'#555'} strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round"/></svg>)},
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ deposits: 0, kyc: 0, withdrawals: 0, chat: 0 })

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (pathname === '/admin/login') return
    fetch('/api/admin/dashboard').then(r => {
      if (r.status === 401) { router.push('/admin/login'); return null }
      return r.json()
    }).then(d => {
      if (d?.stats) setPendingCounts({
        deposits: d.stats.pendingDeposits || 0,
        kyc: d.stats.pendingKyc || 0,
        withdrawals: d.stats.pendingWithdrawals || 0,
        chat: 0,
      })
    }).catch(() => router.push('/admin/login'))
  }, [pathname, router])

  useEffect(() => {
    if (pathname === '/admin/login') return
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
      authEndpoint: '/api/pusher/auth',
    })
    const channel = pusher.subscribe('private-admin')
    channel.bind('admin:new_deposit', () => setPendingCounts(c => ({ ...c, deposits: c.deposits + 1 })))
    channel.bind('admin:kyc_submitted', () => setPendingCounts(c => ({ ...c, kyc: c.kyc + 1 })))
    return () => { channel.unbind_all(); pusher.unsubscribe('private-admin'); pusher.disconnect() }
  }, [pathname])

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080808', fontFamily: 'Inter,-apple-system,sans-serif', color: '#fff' }}>
      {isMobile && mobileMenuOpen && <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 60 }} />}

      <aside style={{
        width: collapsed ? 64 : 220,
        flexShrink: 0,
        background: '#0B0B0B',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        position: isMobile ? 'fixed' as const : 'relative' as const,
        zIndex: 70,
        inset: isMobile ? '0 auto 0 0' : undefined,
        transform: isMobile && !mobileMenuOpen ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform .2s ease',
        height: isMobile ? '100vh' : 'auto',
      }}>
        <div style={{ padding: collapsed ? '14px 10px' : '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 10 }}>
          {collapsed ? <AltarisLogoMark size={24} /> : <><div style={{ display: 'flex', alignItems: 'center', gap: 9 }}><AltarisLogoMark size={22} /><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#ddd' }}>ALTARIS ADMIN</span></div><button onClick={() => setCollapsed(true)} style={{ border: 'none', background: 'transparent', color: '#555', cursor: 'pointer', fontSize: 16 }}>‹</button></>}
          {collapsed && <button onClick={() => setCollapsed(false)} style={{ border: 'none', background: 'transparent', color: '#555', cursor: 'pointer', fontSize: 16 }}>›</button>}
        </div>

        <nav style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const active = pathname.startsWith(href)
            const badge = badges[href as keyof typeof badges] ?? 0
            return (
              <Link key={href} href={href} onClick={() => isMobile && setMobileMenuOpen(false)} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? '11px 0' : '11px 12px', borderRadius: 10, cursor: 'pointer', background: active ? 'rgba(242,186,14,0.08)' : 'transparent', borderLeft: active ? '2px solid #F2BA0E' : '2px solid transparent', justifyContent: collapsed ? 'center' : 'flex-start', transition: 'all .15s', position: 'relative' }}>
                  {icon(active)}
                  {!collapsed && <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#F2BA0E' : '#666', flex: 1, whiteSpace: 'nowrap' }}>{label}</span>}
                  {!collapsed && badge > 0 && <div style={{ background: '#F6465D', color: '#fff', borderRadius: 99, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, padding: '0 4px' }}>{badge}</div>}
                </div>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <header style={{ height: 52, background: '#0E0E0E', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 14px', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMobile && <button onClick={() => setMobileMenuOpen(true)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#aaa' }}>☰</button>}
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0ECB81', animation: 'pulseLive 2s infinite' }} />
            <span style={{ color: '#0ECB81', fontSize: 12, fontWeight: 600 }}>System Live</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#444', fontSize: 12 }}>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <Link href="/" target="_blank" style={{ fontSize: 12, color: '#555', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.07)' }}>View Site</Link>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
