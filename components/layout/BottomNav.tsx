'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/app/home', label: 'Home', icon: '⊞' },
  { href: '/app/markets', label: 'Markets', icon: '◉' },
  { href: '/app/invest', label: 'Invest', icon: '⊕' },
  { href: '/app/airdrop', label: 'Airdrop', icon: '★' },
  { href: '/app/wallet', label: 'Wallet', icon: '◈' },
  { href: '/app/profile', label: 'Profile', icon: '◎' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-2xl border-t border-[var(--border)]">
      <div className="max-w-[430px] mx-auto px-2 h-16 flex items-center justify-around">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all ${
                isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'
              }`}
            >
              <span className="text-base font-bold" style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)' }}>
                {item.icon}
              </span>
              <span className={`text-[9px] font-bold tracking-wide ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                {item.label}
              </span>
              {isActive && <div className="w-1 h-1 rounded-full bg-[var(--primary)]" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
