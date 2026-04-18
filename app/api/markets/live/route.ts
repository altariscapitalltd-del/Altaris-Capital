import { NextResponse } from 'next/server'

const CACHE: { data: any; ts: number } | null = null as any
const TTL = 5 * 60 * 1000
let _cache: { data: any; ts: number } | null = null

async function yahooPrice(ticker: string): Promise<{ price: number; change24h: number; spark: number[] }> {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=8d`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Yahoo ${ticker} ${res.status}`)
  const json = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result) throw new Error(`No result for ${ticker}`)
  const meta = result.meta
  const closes: number[] = (result.indicators?.quote?.[0]?.close || []).filter((n: any) => n != null && !isNaN(n))
  const current: number = meta.regularMarketPrice ?? closes[closes.length - 1] ?? 0
  const prev: number = closes.length >= 2 ? closes[closes.length - 2] : (meta.chartPreviousClose ?? current)
  const change24h = prev ? ((current - prev) / prev) * 100 : 0
  return {
    price: parseFloat(current.toFixed(2)),
    change24h: parseFloat(change24h.toFixed(2)),
    spark: closes.slice(-20),
  }
}

export async function GET() {
  if (_cache && _cache.ts + TTL > Date.now()) {
    return NextResponse.json(_cache.data)
  }

  const markets: any[] = []

  // ── 1. Crypto via CoinGecko ──────────────────────────────
  try {
    const ids = 'bitcoin,ethereum,solana,binancecoin,ripple,avalanche-2,matic-network,chainlink'
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h`,
      { next: { revalidate: 300 } }
    )
    if (res.ok) {
      const coins = await res.json()
      const META: Record<string, { icon: string; color: string }> = {
        bitcoin:        { icon: '₿',  color: '#F7931A' },
        ethereum:       { icon: 'Ξ',  color: '#627EEA' },
        solana:         { icon: '◎',  color: '#9945FF' },
        binancecoin:    { icon: '◆',  color: '#F0B90B' },
        ripple:         { icon: '◉',  color: '#0085C0' },
        'avalanche-2':  { icon: '▲',  color: '#E84142' },
        'matic-network':{ icon: '⬟',  color: '#8247E5' },
        chainlink:      { icon: '⬡',  color: '#2A5ADA' },
      }
      coins.forEach((c: any) => {
        const m = META[c.id] || { icon: '○', color: '#888' }
        markets.push({
          symbol: c.symbol?.toUpperCase(),
          name: c.name,
          category: 'Crypto',
          price: c.current_price,
          change24h: parseFloat((c.price_change_percentage_24h || 0).toFixed(2)),
          color: m.color,
          icon: m.icon,
          image: c.image || null,
          spark: (c.sparkline_in_7d?.price || []).filter(Boolean).slice(-20),
          marketCap: c.market_cap,
        })
      })
    }
  } catch {}

  // ── 2. DeFi / Web3 via CoinGecko ─────────────────────────
  try {
    const defiIds = 'uniswap,aave,compound-governance-token,curve-dao-token,maker'
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${defiIds}&sparkline=true`,
      { next: { revalidate: 300 } }
    )
    if (res.ok) {
      const coins = await res.json()
      const META: Record<string, { icon: string; color: string }> = {
        uniswap:                   { icon: '🦄', color: '#FF007A' },
        aave:                      { icon: '👻', color: '#B6509E' },
        'compound-governance-token':{ icon: '🌿', color: '#00D395' },
        'curve-dao-token':         { icon: '🌀', color: '#F5A623' },
        maker:                     { icon: '🔷', color: '#1AAB9B' },
      }
      coins.forEach((c: any) => {
        const m = META[c.id] || { icon: '⟡', color: '#7C3AED' }
        markets.push({
          symbol: c.symbol?.toUpperCase(),
          name: c.name,
          category: 'DeFi',
          price: c.current_price,
          change24h: parseFloat((c.price_change_percentage_24h || 0).toFixed(2)),
          color: m.color,
          icon: m.icon,
          spark: (c.sparkline_in_7d?.price || []).filter(Boolean).slice(-20),
        })
      })
    }
  } catch {}

  // ── 3. Stocks / REITs / Bonds / Commodities / ETFs via Yahoo Finance ──
  const YAHOO: { sym: string; name: string; cat: string; color: string; icon: string }[] = [
    // Stocks
    { sym: 'SPY',   name: 'S&P 500 ETF',         cat: 'Stocks',       color: '#3B82F6', icon: '📈' },
    { sym: 'QQQ',   name: 'NASDAQ-100 ETF',       cat: 'Stocks',       color: '#6366F1', icon: '📊' },
    { sym: 'AAPL',  name: 'Apple Inc.',            cat: 'Stocks',       color: '#94A3B8', icon: '🍎' },
    { sym: 'NVDA',  name: 'NVIDIA Corp.',          cat: 'Stocks',       color: '#76B900', icon: '⚡' },
    { sym: 'MSFT',  name: 'Microsoft Corp.',       cat: 'Stocks',       color: '#00BCF2', icon: '🖥️' },
    { sym: 'TSLA',  name: 'Tesla Inc.',            cat: 'Stocks',       color: '#E31937', icon: '🚗' },
    // Real Estate
    { sym: 'VNQ',   name: 'Vanguard REIT ETF',    cat: 'Real Estate',  color: '#D97706', icon: '🏢' },
    { sym: 'IYR',   name: 'iShares Real Estate',  cat: 'Real Estate',  color: '#B45309', icon: '🏠' },
    { sym: 'O',     name: 'Realty Income Corp',   cat: 'Real Estate',  color: '#92400E', icon: '💰' },
    // Bonds
    { sym: 'TLT',   name: 'US Treasury 20Y',      cat: 'Bonds',        color: '#1D4ED8', icon: '🏛️' },
    { sym: 'LQD',   name: 'Corp Bond ETF',         cat: 'Bonds',        color: '#2563EB', icon: '📜' },
    { sym: 'HYG',   name: 'High Yield Bond',       cat: 'Bonds',        color: '#1E40AF', icon: '💵' },
    { sym: 'BND',   name: 'Vanguard Bond Index',   cat: 'Bonds',        color: '#1E3A8A', icon: '🗝️' },
    // Commodities
    { sym: 'GC=F',  name: 'Gold (Spot)',            cat: 'Commodities',  color: '#D97706', icon: '🥇' },
    { sym: 'SI=F',  name: 'Silver (Spot)',          cat: 'Commodities',  color: '#9CA3AF', icon: '🥈' },
    { sym: 'CL=F',  name: 'Crude Oil WTI',         cat: 'Commodities',  color: '#92400E', icon: '🛢️' },
    { sym: 'NG=F',  name: 'Natural Gas',            cat: 'Commodities',  color: '#0EA5E9', icon: '🔥' },
    // ETF
    { sym: 'ICLN',  name: 'Clean Energy ETF',      cat: 'ETF',          color: '#16A34A', icon: '🌱' },
    { sym: 'XLV',   name: 'Healthcare ETF',         cat: 'ETF',          color: '#0891B2', icon: '🏥' },
    { sym: 'GLD',   name: 'SPDR Gold ETF',          cat: 'ETF',          color: '#F59E0B', icon: '✨' },
    { sym: 'ARKK',  name: 'ARK Innovation ETF',    cat: 'ETF',          color: '#7C3AED', icon: '🚀' },
  ]

  const yahooResults = await Promise.allSettled(YAHOO.map(t => yahooPrice(t.sym)))

  yahooResults.forEach((result, i) => {
    const t = YAHOO[i]
    if (result.status === 'fulfilled') {
      const symMap: Record<string, string> = { 'GC=F': 'XAU', 'SI=F': 'XAG', 'CL=F': 'OIL', 'NG=F': 'GAS' }
      markets.push({
        symbol: symMap[t.sym] || t.sym,
        name: t.name,
        category: t.cat,
        price: result.value.price,
        change24h: result.value.change24h,
        color: t.color,
        icon: t.icon,
        spark: result.value.spark,
      })
    }
  })

  // ── 4. Forex via ExchangeRate API (free, no key needed) ──
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      const rates: Record<string, number> = data.rates || {}
      const PAIRS = [
        { sym: 'EUR/USD', name: 'Euro / US Dollar',        color: '#2563EB', icon: '€',  base: 'EUR', inv: false },
        { sym: 'GBP/USD', name: 'Pound / US Dollar',       color: '#7C3AED', icon: '£',  base: 'GBP', inv: false },
        { sym: 'USD/JPY', name: 'Dollar / Japanese Yen',   color: '#DC2626', icon: '¥',  base: 'JPY', inv: true  },
        { sym: 'AUD/USD', name: 'Australian / US Dollar',  color: '#059669', icon: 'A$', base: 'AUD', inv: false },
        { sym: 'USD/CAD', name: 'Dollar / Canadian Dollar',color: '#0891B2', icon: 'C$', base: 'CAD', inv: true  },
        { sym: 'USD/CHF', name: 'Dollar / Swiss Franc',    color: '#E11D48', icon: 'Fr', base: 'CHF', inv: true  },
      ]
      for (const pair of PAIRS) {
        const r = rates[pair.base]
        if (!r) continue
        const price = pair.inv ? parseFloat(r.toFixed(3)) : parseFloat((1 / r).toFixed(5))
        markets.push({
          symbol: pair.sym,
          name: pair.name,
          category: 'Forex',
          price,
          change24h: 0,
          color: pair.color,
          icon: pair.icon,
          spark: [],
          isYield: false,
        })
      }
    }
  } catch {}

  // ── 5. Fixed Income yields (APY indicators, not prices) ──
  const FIXED: any[] = [
    { symbol: 'USDC-APY', name: 'USD Coin Savings',  category: 'Fixed Income', price: 5.20, change24h: 0.0,  color: '#2775CA', icon: '🔵', spark: [], isYield: true },
    { symbol: 'USDT-APY', name: 'Tether Yield Pool', category: 'Fixed Income', price: 4.80, change24h: -0.1, color: '#26A17B', icon: '💚', spark: [], isYield: true },
    { symbol: 'DAI-APY',  name: 'DAI Savings Rate',  category: 'Fixed Income', price: 5.00, change24h: 0.2,  color: '#F4B731', icon: '🟡', spark: [], isYield: true },
    { symbol: 'T-BILL',   name: 'US T-Bill 3M',      category: 'Fixed Income', price: 5.35, change24h: 0.0,  color: '#1D4ED8', icon: '🏛️', spark: [], isYield: true },
    { symbol: 'ON-RATE',  name: 'Overnight Rate',    category: 'Fixed Income', price: 5.50, change24h: 0.0,  color: '#059669', icon: '🏦', spark: [], isYield: true },
  ]
  markets.push(...FIXED)

  // ── 6. Hedge Fund indices (illustrative) ─────────────────
  const HEDGE: any[] = [
    { symbol: 'HFRX', name: 'HFRX Global Hedge',     category: 'Hedge', price: 1342.85, change24h: 0.18, color: '#1D4ED8', icon: '🏦', spark: [] },
    { symbol: 'MCSI',  name: 'Merger Arb Index',     category: 'Hedge', price: 892.40,  change24h: 0.05, color: '#7C3AED', icon: '🔀', spark: [] },
  ]
  markets.push(...HEDGE)

  const result = { markets, timestamp: Date.now() }
  _cache = { data: result, ts: Date.now() }
  return NextResponse.json(result)
}
