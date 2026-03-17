'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Pusher from 'pusher-js'
import { AltarisLogoMark } from '@/components/AltarisLogo'
import { Bell, BarChart3, CircleDollarSign, CreditCard, LayoutDashboard, Menu, MessageCircle, Search, Settings, ShieldCheck, UserRound, Users, X } from 'lucide-react'

type PendingCounts = {
  deposits: number
  kyc: number
  withdrawals: number
  chat: number
}

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/deposits', label: 'Deposits', icon: CircleDollarSign },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: CreditCard },
  { href: '/admin/kyc', label: 'KYC Review', icon: ShieldCheck },
  { href: '/admin/chat', label: 'Support', icon: MessageCircle },
  { href: '/admin/notifications', label: 'Broadcast', icon: Bell },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

const MOBILE_NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: UserRound },
  { href: '/admin/deposits', label: 'Deposits', icon: CircleDollarSign },
  { href: '/admin/kyc', label: 'KYC', icon: ShieldCheck },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ deposits: 0, kyc: 0, withdrawals: 0, chat: 0 })

  useEffect(() => {
    if (pathname === '/admin/login') return
    fetch('/api/admin/dashboard')
      .then((r) => {
        if (r.status === 401) {
          router.push('/admin/login')
          return null
        }
        return r.json()
      })
      .then((d) => {
        if (d?.stats) {
          setPendingCounts({
            deposits: d.stats.pendingDeposits || 0,
            kyc: d.stats.pendingKyc || 0,
            withdrawals: d.stats.pendingWithdrawals || 0,
            chat: 0,
          })
        }
      })
      .catch(() => router.push('/admin/login'))
  }, [pathname, router])

  useEffect(() => {
    if (pathname === '/admin/login') return
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
      authEndpoint: '/api/pusher/auth',
    })

    const channel = pusher.subscribe('private-admin')
    channel.bind('admin:new_deposit', () => setPendingCounts((c) => ({ ...c, deposits: c.deposits + 1 })))
    channel.bind('admin:kyc_submitted', () => setPendingCounts((c) => ({ ...c, kyc: c.kyc + 1 })))

    return () => {
      channel.unbind_all()
      pusher.unsubscribe('private-admin')
      pusher.disconnect()
    }
  }, [pathname])

  const badges = useMemo(
    () => ({
      '/admin/deposits': pendingCounts.deposits,
      '/admin/withdrawals': pendingCounts.withdrawals,
      '/admin/kyc': pendingCounts.kyc,
      '/admin/chat': pendingCounts.chat,
    }),
    [pendingCounts]
  )

  if (pathname === '/admin/login') return <>{children}</>

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-head">
          <div className="admin-brand">
            <AltarisLogoMark size={20} />
            <div>
              <div>Altaris</div>
              <small>Admin Suite</small>
            </div>
          </div>
          <button className="admin-close-mobile" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
            <X size={16} />
          </button>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href)
            const badge = badges[item.href as keyof typeof badges] ?? 0
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} className={`admin-nav-link ${active ? 'active' : ''}`} onClick={() => setMobileMenuOpen(false)}>
                <span><Icon size={15} />{item.label}</span>
                {badge > 0 && <em>{badge}</em>}
              </Link>
            )
          })}
        </nav>
      </aside>

      {mobileMenuOpen && <div className="admin-backdrop" onClick={() => setMobileMenuOpen(false)} />}

      <div className="admin-content-wrap">
        <header className="admin-topbar">
          <button className="admin-open-mobile" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <div className="admin-top-meta">
            <div className="admin-search-pill"><Search size={13}/> Search records</div>
            <div className="admin-live"><span />System Live</div>
          </div>
          <div className="admin-top-actions">
            <small>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</small>
            <Link href="/" target="_blank">View App</Link>
          </div>
        </header>

        <main className="admin-page">{children}</main>

        <nav className="admin-bottom-nav" aria-label="Admin mobile navigation">
          {MOBILE_NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href)
            const badge = badges[item.href as keyof typeof badges] ?? 0
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href} className={`admin-bottom-link ${active ? 'active' : ''}`}>
                <Icon size={15} />
                <span>{item.label}</span>
                {badge > 0 && <em>{badge}</em>}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
