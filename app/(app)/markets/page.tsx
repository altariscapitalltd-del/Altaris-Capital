'use client'

import { useState } from 'react'
import Link from 'next/link'
import AnimatedPage from '@/components/animations/AnimatedPage'
import { useLiveCrypto } from '@/hooks/useLiveCrypto'
import { BottomNav } from '@/components/layout/BottomNav'
import { AltarisLogoMark } from '@/components/AltarisLogo'

export default function MarketsPage() {
  const { prices } = useLiveCrypto(5000)
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'change'|'cap'>('cap')
  const [showSort, setShowSort] = useState(false)

  const filters = ['All', 'Crypto', 'Stocks', 'Forex', 'Commodities']

  const marketData = [
    { symbol: 'BTC', name: 'Bitcoin', price: prices?.bitcoin?.usd || 108420, change: prices?.bitcoin?.usd_24h_change || 2.34, cap: 2.1, type: 'Crypto', color: '#F7931A' },
    { symbol: 'ETH', name: 'Ethereum', price: prices?.ethereum?.usd || 3650, change: prices?.ethereum?.usd_24h_change || 1.87, cap: 0.42, type: 'Crypto', color: '#627EEA' },
    { symbol: 'SOL', name: 'Solana', price: prices?.solana?.usd || 198, change: prices?.solana?.usd_24h_change || 3.56, cap: 0.085, type: 'Crypto', color: '#9945FF' },
    { symbol: 'XRP', name: 'XRP', price: prices?.ripple?.usd || 2.45, change: prices?.ripple?.usd_24h_change || 5.12, cap: 0.13, type: 'Crypto', color: '#E74C3C' },
    { symbol: 'BNB', name: 'BNB', price: prices?.binancecoin?.usd || 720, change: prices?.binancecoin?.usd_24h_change || 0.89, cap: 0.11, type: 'Crypto', color: '#F0B90B' },
    { symbol: 'AAPL', name: 'Apple', price: 198.5, change: 1.23, cap: 3.0, type: 'Stocks', color: '#555' },
    { symbol: 'NVDA', name: 'NVIDIA', price: 142.3, change: -2.15, cap: 3.5, type: 'Stocks', color: '#76B900' },
    { symbol: 'TSLA', name: 'Tesla', price: 248.7, change: 3.45, cap: 0.78, type: 'Stocks', color: '#CC0000' },
    { symbol: 'MSFT', name: 'Microsoft', price: 432.1, change: 0.67, cap: 3.2, type: 'Stocks', color: '#00A4EF' },
    { symbol: 'EURUSD', name: 'EUR/USD', price: 1.0845, change: -0.23, cap: 0, type: 'Forex', color: '#3B82F6' },
    { symbol: 'GBPUSD', name: 'GBP/USD', price: 1.2740, change: 0.15, cap: 0, type: 'Forex', color: '#0ECB81' },
    { symbol: 'USDJPY', name: 'USD/JPY', price: 149.82, change: -0.45, cap: 0, type: 'Forex', color: '#F6465D' },
    { symbol: 'GOLD', name: 'Gold', price: 2650, change: 0.45, cap: 0, type: 'Commodities', color: '#FFD700' },
    { symbol: 'OIL', name: 'Crude Oil', price: 78.45, change: -1.23, cap: 0, type: 'Commodities', color: '#666' },
    { symbol: 'SILVER', name: 'Silver', price: 31.85, change: 0.78, cap: 0, type: 'Commodities', color: '#C0C0C0' },
  ]

  const filtered = marketData
    .filter(item => activeFilter === 'All' || item.type === activeFilter)
    .filter(item => !searchTerm || item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => sortBy === 'change' ? Math.abs(b.change) - Math.abs(a.change) : b.cap - a.cap)

  const topGainer = marketData.reduce((best, c) => c.change > best.change ? c : best, marketData[0])
  const topLoser = marketData.reduce((worst, c) => c.change < worst.change ? c : worst, marketData[0])

  return (
    <AnimatedPage className="min-h-[100dvh]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-[var(--border)]">
        <div className="max-w-[430px] mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AltarisLogoMark size={24} />
            <span className="font-extrabold text-sm tracking-widest uppercase">Markets</span>
          </div>
          <Link href="/app/home" className="font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-[11px]">&larr; Home</Link>
        </div>
      </header>

      <div className="max-w-[430px] mx-auto px-4 pb-24">
        <div className="mt-4 mb-3">
          <input type="text" placeholder="Search assets..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-sm focus:outline-none focus:border-[var(--primary)]/50 transition-colors" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-gradient-to-br from-[#0ECB81]/10 to-transparent border border-[#0ECB81]/20 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-[#0ECB81]" />
              <span className="text-[10px] font-bold text-[#0ECB81] uppercase tracking-wider">Top Gainer</span>
            </div>
            <div className="font-extrabold text-base">{topGainer.symbol}</div>
            <div className="text-[#0ECB81] font-bold text-sm">+{topGainer.change.toFixed(2)}%</div>
          </div>
          <div className="bg-gradient-to-br from-[#F6465D]/10 to-transparent border border-[#F6465D]/20 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-[#F6465D]" />
              <span className="text-[10px] font-bold text-[#F6465D] uppercase tracking-wider">Top Loser</span>
            </div>
            <div className="font-extrabold text-base">{topLoser.symbol}</div>
            <div className="text-[#F6465D] font-bold text-sm">{topLoser.change.toFixed(2)}%</div>
          </div>
        </div>

        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {filters.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${activeFilter === f ? 'bg-[var(--primary)]/12 text-[var(--primary)] border-[var(--primary)]/25' : 'bg-white/[0.02] text-[#666] border-white/[0.06]'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{filtered.length} Assets</span>
          <div className="relative">
            <button onClick={() => setShowSort(!showSort)} className="text-xs font-bold text-[#666] flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/[0.03]">
              Sort <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            {showSort && (
              <div className="absolute right-0 top-8 bg-[#111] border border-[var(--border)] rounded-xl p-1 z-10 min-w-[120px]">
                {[{k:'cap' as const,l:'Market Cap'},{k:'change' as const,l:'24h Change'}].map(s => (
                  <button key={s.k} onClick={() => { setSortBy(s.k); setShowSort(false) }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold ${sortBy === s.k ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[#666] hover:bg-white/[0.03]'}`}>{s.l}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 border-b border-[var(--border)]">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Asset</span>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Price</span>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">24h</span>
          </div>
          {filtered.map(item => {
            const up = item.change >= 0
            return (
              <div key={item.symbol} className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 border-b border-[var(--border)]/50 hover:bg-white/[0.02] transition-colors items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs flex-shrink-0" style={{ background: item.color + '15', border: '1px solid ' + item.color + '30', color: item.color }}>
                    {item.symbol.slice(0,2)}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{item.symbol}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{item.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-sm tabular-nums">${item.price >= 1000 ? item.price.toLocaleString(undefined, {maximumFractionDigits:0}) : item.price >= 10 ? item.price.toFixed(2) : item.price.toFixed(4)}</div>
                </div>
                <span className={`font-extrabold text-xs px-2 py-1 rounded-md ${up ? 'text-[#0ECB81] bg-[#0ECB81]/10' : 'text-[#F6465D] bg-[#F6465D]/10'}`}>
                  {up ? '+' : ''}{item.change.toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-[#444]">
            <div className="font-bold text-base text-[#666]">No assets found</div>
          </div>
        )}
      </div>

      <BottomNav />
    </AnimatedPage>
  )
}
