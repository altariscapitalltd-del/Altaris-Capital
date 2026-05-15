'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AnimatedPage from '@/components/animations/AnimatedPage'
import { useLanguage } from '@/contexts/LanguageContext'
import { BottomNav } from '@/components/layout/BottomNav'
import { AltarisLogoMark } from '@/components/AltarisLogo'

const PLANS = [
  { id: 'stable', name: 'Stablecoin Reserve', roi: '0.6% daily', dur: '60 days', min: '$40', max: '$50,000', risk: 1, cat: 'CRYPTO', color: '#0ECB81', desc: 'Conservative daily returns on stablecoins with capital preservation.' },
  { id: 'save', name: 'Altaris Smart Save', roi: '40% / year', dur: '1 year', min: '$500', max: '$100,000', risk: 1, cat: 'BONDS', color: '#3B82F6', desc: 'Fixed annual yield backed by diversified bond portfolio.' },
  { id: 'equity', name: 'Blue Chip Equities', roi: '1.2% daily', dur: '90 days', min: '$1,000', max: '$250,000', risk: 2, cat: 'STOCKS', color: '#A855F7', desc: 'Daily returns from top-performing blue chip stock basket.' },
  { id: 'realestate', name: 'Prime Real Estate', roi: '1.8% daily', dur: '180 days', min: '$2,500', max: '$500,000', risk: 2, cat: 'REAL EST', color: '#F97316', desc: 'Fractional real estate investment with premium daily yields.' },
  { id: 'defi', name: 'DeFi Accelerator', roi: '3.5% daily', dur: '7 days', min: '$2,000', max: '$50,000', risk: 3, cat: 'DEFI', color: '#F6465D', desc: 'High-frequency DeFi protocol arbitrage for maximum returns.' },
  { id: 'commodity', name: 'Commodity Hedge', roi: '1.0% daily', dur: '120 days', min: '$1,500', max: '$200,000', risk: 2, cat: 'COMMOD', color: '#F2BA0E', desc: 'Gold, silver & oil exposure with inflation-hedged returns.' },
]

const RISK_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Low Risk', color: '#0ECB81' },
  2: { label: 'Medium Risk', color: '#F2BA0E' },
  3: { label: 'High Risk', color: '#F6465D' },
}

export default function InvestPage() {
  const { t } = useLanguage()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [deposit, setDeposit] = useState('')
  const [invested, setInvested] = useState<Record<string, number>>({})

  useEffect(() => {
    try { const saved = localStorage.getItem('altaris_investments'); if (saved) setInvested(JSON.parse(saved)) } catch {}
  }, [])

  const selected = PLANS.find(p => p.id === selectedPlan)

  const handleInvest = () => {
    if (!selected || !deposit || parseFloat(deposit) < parseFloat(selected.min.replace('$', '').replace(',', ''))) return
    const updated = { ...invested, [selected.id]: (invested[selected.id] || 0) + parseFloat(deposit) }
    setInvested(updated)
    try { localStorage.setItem('altaris_investments', JSON.stringify(updated)) } catch {}
    setDeposit('')
    setSelectedPlan(null)
  }

  return (
    <AnimatedPage className="min-h-[100dvh]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-[var(--border)]">
        <div className="max-w-[430px] mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AltarisLogoMark size={24} />
            <span className="font-extrabold text-sm tracking-widest uppercase">Invest</span>
          </div>
          <Link href="/app/home" className="font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-[11px]">&larr; Home</Link>
        </div>
      </header>

      <div className="max-w-[430px] mx-auto px-4 pb-24">
        {/* Summary Card */}
        <div className="mt-4 mb-4 bg-gradient-to-br from-[#F2BA0E]/10 via-transparent to-transparent border border-[#F2BA0E]/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(242,186,14,0.08), transparent)' }} />
          <div className="relative z-10">
            <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Invested</div>
            <div className="font-black text-2xl mb-3">${Object.values(invested).reduce((a, b) => a + b, 0).toLocaleString()}</div>
            <div className="flex gap-4">
              <div><div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Active Plans</div><div className="font-extrabold text-sm">{Object.keys(invested).length}</div></div>
              <div><div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Est. Daily</div><div className="font-extrabold text-sm text-[#0ECB81]">+${(Object.entries(invested).reduce((sum, [id, amt]) => {
                const plan = PLANS.find(p => p.id === id)
                return sum + (plan ? amt * parseFloat(plan.roi) / 100 : 0)
              }, 0)).toFixed(2)}</div></div>
            </div>
          </div>
        </div>

        {/* Plans */}
        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Investment Plans</div>
        <div className="grid gap-3">
          {PLANS.map(plan => {
            const risk = RISK_LABELS[plan.risk]
            const isInvested = invested[plan.id]
            return (
              <div key={plan.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 hover:border-[var(--border)]/80 transition-all cursor-pointer pressable" onClick={() => setSelectedPlan(plan.id)}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs" style={{ background: plan.color + '15', border: '1px solid ' + plan.color + '30', color: plan.color }}>
                      {plan.cat.slice(0,2)}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{plan.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold" style={{ background: risk.color + '15', color: risk.color }}>{risk.label}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{plan.dur}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-sm" style={{ color: plan.color }}>{plan.roi}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Min {plan.min}</div>
                  </div>
                </div>
                <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-3">{plan.desc}</div>
                {isInvested ? (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0ECB81]/8 border border-[#0ECB81]/15">
                    <span className="text-[11px] text-[#0ECB81] font-bold">Invested: ${isInvested.toLocaleString()}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Active</span>
                  </div>
                ) : (
                  <button className="w-full py-2.5 rounded-xl text-xs font-extrabold border-0 cursor-pointer pressable" style={{ background: `linear-gradient(135deg, ${plan.color}20, ${plan.color}10)`, color: plan.color, border: `1px solid ${plan.color}25` }}>
                    Invest Now
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Invest Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end justify-center" onClick={() => setSelectedPlan(null)}>
          <div className="bg-[#0A0A0A] border border-[var(--border)] rounded-t-3xl p-6 max-w-[430px] w-full" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-[#333] rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold" style={{ background: selected.color + '15', border: '1px solid ' + selected.color + '30', color: selected.color }}>
                {selected.cat.slice(0,2)}
              </div>
              <div>
                <div className="font-bold text-base">{selected.name}</div>
                <div className="font-black text-sm" style={{ color: selected.color }}>{selected.roi} / {selected.dur}</div>
              </div>
            </div>
            <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase mb-1">Min: {selected.min} &middot; Max: {selected.max}</div>
              <div className="text-[12px] text-[var(--text-secondary)]">{selected.desc}</div>
            </div>
            <input
              type="number"
              value={deposit}
              onChange={e => setDeposit(e.target.value)}
              placeholder={`Min ${selected.min}`}
              className="w-full py-3 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-base font-bold focus:outline-none focus:border-[var(--primary)]/50 transition-colors mb-4"
            />
            <button
              onClick={handleInvest}
              disabled={!deposit || parseFloat(deposit) < parseFloat(selected.min.replace('$', '').replace(',', ''))}
              className="w-full py-3.5 rounded-xl font-extrabold text-sm border-0 cursor-pointer pressable disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, ' + selected.color + ', ' + selected.color + 'cc)', color: '#000' }}
            >
              Confirm Investment
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </AnimatedPage>
  )
}
