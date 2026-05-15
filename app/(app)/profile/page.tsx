'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import AnimatedPage from '@/components/animations/AnimatedPage'
import { useLanguage } from '@/contexts/LanguageContext'
import { BottomNav } from '@/components/layout/BottomNav'
import { AltarisLogoMark } from '@/components/AltarisLogo'

export default function ProfilePage() {
  const { data: session } = useSession()
  const { language, setLanguage, t } = useLanguage()
  const [showLang, setShowLang] = useState(false)
  const [showLogout, setShowLogout] = useState(false)

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Francais', flag: '🇫🇷' },
    { code: 'es', name: 'Espanol', flag: '🇪🇸' },
    { code: 'pt', name: 'Portugues', flag: '🇵🇹' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  ]

  const menuItems = [
    { icon: '◈', label: 'Wallet', href: '/app/wallet', color: '#F2BA0E' },
    { icon: '⊕', label: 'Investments', href: '/app/invest', color: '#0ECB81' },
    { icon: '★', label: 'Airdrops', href: '/app/airdrop', color: '#A855F7', badge: '3 New' },
    { icon: '🌍', label: 'Language', action: () => setShowLang(true), color: '#3B82F6', value: languages.find(l => l.code === language)?.name || 'English' },
    { icon: '⚙', label: 'Settings', href: '/app/settings', color: '#666' },
    { icon: '?', label: 'Help & Support', href: '/app/support', color: '#666' },
  ]

  return (
    <AnimatedPage className="min-h-[100dvh]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-[var(--border)]">
        <div className="max-w-[430px] mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AltarisLogoMark size={24} />
            <span className="font-extrabold text-sm tracking-widest uppercase">Profile</span>
          </div>
          <Link href="/app/home" className="font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-[11px]">&larr; Home</Link>
        </div>
      </header>

      <div className="max-w-[430px] mx-auto px-4 pb-24">
        {/* User Card */}
        <div className="mt-4 mb-4 bg-gradient-to-br from-[#F2BA0E]/10 via-transparent to-transparent border border-[#F2BA0E]/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(242,186,14,0.08), transparent)' }} />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/70 flex items-center justify-center text-2xl font-black text-[var(--bg-dark)] flex-shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-lg truncate">{session?.user?.name || 'User'}</div>
              <div className="text-[11px] text-[var(--text-muted)] truncate">{session?.user?.email || 'user@altaris.capital'}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 rounded-md bg-[#0ECB81]/10 text-[#0ECB81] text-[10px] font-extrabold border border-[#0ECB81]/20">Verified</span>
                <span className="px-2 py-0.5 rounded-md bg-[#3B82F6]/10 text-[#3B82F6] text-[10px] font-extrabold border border-[#3B82F6]/20">KYC Complete</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Invested', value: '$12,500', color: '#F2BA0E' },
            { label: 'Returns', value: '$3,240', color: '#0ECB81' },
            { label: 'Airdrops', value: '3', color: '#A855F7' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 text-center">
              <div className="font-black text-sm" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Menu Items */}
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Menu</div>
        <div className="flex flex-col gap-2">
          {menuItems.map(item => (
            item.href ? (
              <Link key={item.label} href={item.href} className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:bg-white/[0.02] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold" style={{ background: item.color + '15', color: item.color }}>{item.icon}</div>
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && <span className="px-2 py-0.5 rounded-md bg-[#F6465D]/10 text-[#F6465D] text-[10px] font-extrabold">{item.badge}</span>}
                  {item.value && <span className="text-[11px] text-[var(--text-muted)]">{item.value}</span>}
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#444" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </Link>
            ) : (
              <button key={item.label} onClick={item.action} className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:bg-white/[0.02] transition-all w-full text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold" style={{ background: item.color + '15', color: item.color }}>{item.icon}</div>
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.value && <span className="text-[11px] text-[var(--text-muted)]">{item.value}</span>}
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#444" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </button>
            )
          ))}
        </div>

        {/* Logout */}
        <button onClick={() => setShowLogout(true)} className="w-full mt-4 p-3.5 rounded-xl bg-[#F6465D]/5 border border-[#F6465D]/15 hover:bg-[#F6465D]/10 transition-all flex items-center justify-center gap-2">
          <span className="text-[#F6465D] font-bold text-sm">Log Out</span>
        </button>
      </div>

      {/* Language Modal */}
      {showLang && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end justify-center" onClick={() => setShowLang(false)}>
          <div className="bg-[#0A0A0A] border border-[var(--border)] rounded-t-3xl p-6 max-w-[430px] w-full" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-[#333] rounded-full mx-auto mb-5" />
            <div className="font-bold text-base mb-4 text-center">Select Language</div>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {languages.map(l => (
                <button key={l.code} onClick={() => { setLanguage(l.code as any); setShowLang(false) }}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${language === l.code ? 'bg-[var(--primary)]/10 border-[var(--primary)]/25' : 'bg-white/[0.02] border-white/[0.04]'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{l.flag}</span>
                    <span className={`font-bold text-sm ${language === l.code ? 'text-[var(--primary)]' : ''}`}>{l.name}</span>
                  </div>
                  {language === l.code && <div className="w-4 h-4 rounded-full bg-[var(--primary)] flex items-center justify-center"><svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirm */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6" onClick={() => setShowLogout(false)}>
          <div className="bg-[#0A0A0A] border border-[var(--border)] rounded-3xl p-6 max-w-[360px] w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="text-3xl mb-3">👋</div>
            <div className="font-bold text-lg mb-2">Log Out?</div>
            <div className="text-[13px] text-[var(--text-muted)] mb-5">Are you sure you want to log out of your account?</div>
            <div className="flex gap-3">
              <button onClick={() => setShowLogout(false)} className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] font-bold text-sm">Cancel</button>
              <button onClick={() => signOut({ callbackUrl: '/' })} className="flex-1 py-3 rounded-xl bg-[#F6465D] text-white font-extrabold text-sm">Log Out</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </AnimatedPage>
  )
}
