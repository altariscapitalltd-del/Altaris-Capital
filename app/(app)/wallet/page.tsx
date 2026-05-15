'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AnimatedPage from '@/components/animations/AnimatedPage'
import { useLanguage } from '@/contexts/LanguageContext'
import { BottomNav } from '@/components/layout/BottomNav'
import { AltarisLogoMark } from '@/components/AltarisLogo'

interface Transaction {
  id: string
  type: 'deposit' | 'withdraw' | 'invest' | 'return'
  amount: number
  currency: string
  date: string
  status: 'completed' | 'pending'
}

const CURRENCIES = [
  { symbol: 'USD', name: 'US Dollar', balance: 12450.75, color: '#0ECB81', icon: '$' },
  { symbol: 'BTC', name: 'Bitcoin', balance: 0.45, color: '#F7931A', icon: '₿' },
  { symbol: 'ETH', name: 'Ethereum', balance: 3.2, color: '#627EEA', icon: 'Ξ' },
  { symbol: 'USDT', name: 'Tether', balance: 8500, color: '#26A17B', icon: '₮' },
  { symbol: 'SOL', name: 'Solana', balance: 45, color: '#9945FF', icon: '◎' },
]

const MOCK_TXNS: Transaction[] = [
  { id: '1', type: 'deposit', amount: 5000, currency: 'USD', date: '2025-05-14', status: 'completed' },
  { id: '2', type: 'invest', amount: 2500, currency: 'USD', date: '2025-05-13', status: 'completed' },
  { id: '3', type: 'return', amount: 85.5, currency: 'USD', date: '2025-05-12', status: 'completed' },
  { id: '4', type: 'deposit', amount: 1.2, currency: 'ETH', date: '2025-05-10', status: 'completed' },
  { id: '5', type: 'withdraw', amount: 1200, currency: 'USD', date: '2025-05-08', status: 'pending' },
  { id: '6', type: 'deposit', amount: 0.15, currency: 'BTC', date: '2025-05-05', status: 'completed' },
]

export default function WalletPage() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'balances'|'history'>('balances')
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0])

  const totalUsd = CURRENCIES.reduce((sum, c) => {
    if (c.symbol === 'USD' || c.symbol === 'USDT') return sum + c.balance
    if (c.symbol === 'BTC') return sum + c.balance * 108420
    if (c.symbol === 'ETH') return sum + c.balance * 3650
    if (c.symbol === 'SOL') return sum + c.balance * 198
    return sum
  }, 0)

  const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
    deposit: { label: 'Deposit', color: '#0ECB81', bg: 'bg-[#0ECB81]/10' },
    withdraw: { label: 'Withdraw', color: '#F6465D', bg: 'bg-[#F6465D]/10' },
    invest: { label: 'Invest', color: '#F2BA0E', bg: 'bg-[#F2BA0E]/10' },
    return: { label: 'Return', color: '#3B82F6', bg: 'bg-[#3B82F6]/10' },
  }

  return (
    <AnimatedPage className="min-h-[100dvh]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-[var(--border)]">
        <div className="max-w-[430px] mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AltarisLogoMark size={24} />
            <span className="font-extrabold text-sm tracking-widest uppercase">Wallet</span>
          </div>
          <Link href="/app/home" className="font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-[11px]">&larr; Home</Link>
        </div>
      </header>

      <div className="max-w-[430px] mx-auto px-4 pb-24">
        {/* Total Balance */}
        <div className="mt-4 mb-4 bg-gradient-to-br from-[#F2BA0E]/10 via-transparent to-transparent border border-[#F2BA0E]/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(242,186,14,0.08), transparent)' }} />
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Balance</div>
            <div className="font-black text-3xl mb-1">${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0ECB81]" />
              <span className="text-[11px] font-bold text-[#0ECB81]">+2.34% today</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Deposit', icon: '↓', color: '#0ECB81', action: () => setShowDeposit(true) },
            { label: 'Withdraw', icon: '↑', color: '#F6465D', action: () => setShowWithdraw(true) },
            { label: 'Invest', icon: '⊕', color: '#F2BA0E', href: '/app/invest' },
          ].map(btn => (
            btn.href ? (
              <Link key={btn.label} href={btn.href} className="flex flex-col items-center gap-2 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border)]/80 transition-all">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold" style={{ background: btn.color + '15', color: btn.color }}>{btn.icon}</div>
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">{btn.label}</span>
              </Link>
            ) : (
              <button key={btn.label} onClick={btn.action} className="flex flex-col items-center gap-2 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border)]/80 transition-all">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-extrabold" style={{ background: btn.color + '15', color: btn.color }}>{btn.icon}</div>
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">{btn.label}</span>
              </button>
            )
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-1">
          {['balances', 'history'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all ${activeTab === tab ? 'bg-[var(--primary)]/12 text-[var(--primary)]' : 'text-[#666]'}`}>
              {tab === 'balances' ? 'Balances' : 'History'}
            </button>
          ))}
        </div>

        {activeTab === 'balances' && (
          <div className="flex flex-col gap-2">
            {CURRENCIES.map(c => (
              <div key={c.symbol} className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:bg-white/[0.02] transition-all cursor-pointer"
                onClick={() => { setSelectedCurrency(c); setShowDeposit(true) }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm" style={{ background: c.color + '15', border: '1px solid ' + c.color + '30', color: c.color }}>
                    {c.icon}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{c.symbol}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{c.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-sm tabular-nums">{c.symbol === 'USD' || c.symbol === 'USDT' ? '$' : ''}{c.balance.toLocaleString()}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{c.symbol}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex flex-col gap-2">
            {MOCK_TXNS.map(tx => {
              const tc = typeConfig[tx.type]
              return (
                <div key={tx.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold ${tc.bg}`} style={{ color: tc.color }}>
                      {tx.type === 'deposit' ? '↓' : tx.type === 'withdraw' ? '↑' : tx.type === 'invest' ? '⊕' : '↩'}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{tc.label}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{tx.date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-extrabold text-sm ${tx.type === 'withdraw' || tx.type === 'invest' ? 'text-[#F6465D]' : 'text-[#0ECB81]'}`}>
                      {tx.type === 'withdraw' || tx.type === 'invest' ? '-' : '+'}{tx.amount} {tx.currency}
                    </div>
                    <div className={`text-[10px] font-bold ${tx.status === 'completed' ? 'text-[#0ECB81]' : 'text-[#F2BA0E]'}`}>{tx.status}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end justify-center" onClick={() => setShowDeposit(false)}>
          <div className="bg-[#0A0A0A] border border-[var(--border)] rounded-t-3xl p-6 max-w-[430px] w-full" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-[#333] rounded-full mx-auto mb-5" />
            <div className="text-center mb-4">
              <div className="text-2xl font-black">↓</div>
              <div className="font-bold text-lg mt-2">Deposit {selectedCurrency.symbol}</div>
              <div className="text-[12px] text-[var(--text-muted)] mt-1">Send funds to your Altaris wallet</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] mb-4 text-center">
              <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-2">Wallet Address</div>
              <div className="font-mono text-xs text-[var(--text-secondary)] break-all">0x7a8b9c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b</div>
            </div>
            <button onClick={() => setShowDeposit(false)} className="w-full py-3.5 rounded-xl bg-[var(--primary)] text-[var(--bg-dark)] font-extrabold text-sm pressable">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end justify-center" onClick={() => setShowWithdraw(false)}>
          <div className="bg-[#0A0A0A] border border-[var(--border)] rounded-t-3xl p-6 max-w-[430px] w-full" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-[#333] rounded-full mx-auto mb-5" />
            <div className="text-center mb-4">
              <div className="text-2xl font-black">↑</div>
              <div className="font-bold text-lg mt-2">Withdraw</div>
            </div>
            <input type="text" placeholder="Wallet address" className="w-full py-3 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm focus:outline-none focus:border-[var(--primary)]/50 mb-3" />
            <input type="number" placeholder="Amount (USD)" className="w-full py-3 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm focus:outline-none focus:border-[var(--primary)]/50 mb-4" />
            <button onClick={() => setShowWithdraw(false)} className="w-full py-3.5 rounded-xl bg-[#F6465D] text-white font-extrabold text-sm pressable">
              Request Withdrawal
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </AnimatedPage>
  )
}
