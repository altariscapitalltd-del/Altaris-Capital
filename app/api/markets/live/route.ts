import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { buildPlans } from '@/lib/investmentPlans'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ─── Cache ────────────────────────────────────────────────────────────────────

const _cache: Record<string, { data: unknown; ts: number }> = {}
const TTL = 5 * 60 * 1000

async function fetchWithCache<T>(key: string, fetcher: () => Promise<T>): Promise<T | null> {
  const hit = _cache[key]
  if (hit && hit.ts + TTL > Date.now()) return hit.data as T
  try {
    const data = await fetcher()
    if (data) _cache[key] = { data, ts: Date.now() }
    return data
  } catch {
    return (hit?.data as T) ?? null
  }
}

// ─── Crypto (CoinGecko) ───────────────────────────────────────────────────────

const CRYPTO_DAILY: Record<string, number> = {
  bitcoin: 0.85, ethereum: 0.70, binancecoin: 0.65, solana: 0.60,
  ripple: 0.45, cardano: 0.40, dogecoin: 0.42, 'avalanche-2': 0.55,
  polkadot: 0.50, chainlink: 0.52, litecoin: 0.48, 'matic-network': 0.50,
  tron: 0.38, 'the-open-network': 0.45, 'shiba-inu': 0.35,
}
const CRYPTO_MIN: Record<string, number> = { bitcoin: 250, ethereum: 100 }

async function getCryptoData() {
  return fetchWithCache('crypto', async () => {
    const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
      params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: 20, page: 1, sparkline: true },
      timeout: 10_000,
    })
    return (res.data as any[]).map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      category: 'Crypto',
      price: c.current_price ?? null,
      change24h: c.price_change_percentage_24h ?? 0,
      image: c.image ?? '',
      spark: (c.sparkline_in_7d?.price as number[] | undefined)?.slice(-24) ?? [],
      dailyReturn: String(CRYPTO_DAILY[c.id] ?? 0.45),
      riskLevel: 4,
      minInvestment: CRYPTO_MIN[c.id] ?? 50,
    }))
  })
}

// ─── Stocks (Finnhub) ─────────────────────────────────────────────────────────

const STOCK_TICKERS = ['AAPL','MSFT','NVDA','TSLA','AMZN','GOOGL','META','JPM','V','WMT','NFLX','AMD','PYPL','UBER','CRM']

const STOCK_META: Record<string, { name: string; domain: string; daily: number; risk: number }> = {
  AAPL:  { name: 'Apple Inc.',          domain: 'apple.com',         daily: 0.14, risk: 2 },
  MSFT:  { name: 'Microsoft Corp.',     domain: 'microsoft.com',     daily: 0.13, risk: 2 },
  NVDA:  { name: 'NVIDIA Corp.',        domain: 'nvidia.com',        daily: 0.18, risk: 3 },
  TSLA:  { name: 'Tesla Inc.',          domain: 'tesla.com',         daily: 0.22, risk: 4 },
  AMZN:  { name: 'Amazon.com Inc.',     domain: 'amazon.com',        daily: 0.14, risk: 3 },
  GOOGL: { name: 'Alphabet Inc.',       domain: 'google.com',        daily: 0.13, risk: 2 },
  META:  { name: 'Meta Platforms',      domain: 'meta.com',          daily: 0.15, risk: 3 },
  JPM:   { name: 'JPMorgan Chase',      domain: 'jpmorganchase.com', daily: 0.10, risk: 2 },
  V:     { name: 'Visa Inc.',           domain: 'visa.com',          daily: 0.10, risk: 1 },
  WMT:   { name: 'Walmart Inc.',        domain: 'walmart.com',       daily: 0.09, risk: 1 },
  NFLX:  { name: 'Netflix Inc.',        domain: 'netflix.com',       daily: 0.16, risk: 3 },
  AMD:   { name: 'Adv. Micro Devices',  domain: 'amd.com',           daily: 0.20, risk: 4 },
  PYPL:  { name: 'PayPal Holdings',     domain: 'paypal.com',        daily: 0.12, risk: 3 },
  UBER:  { name: 'Uber Technologies',   domain: 'uber.com',          daily: 0.17, risk: 3 },
  CRM:   { name: 'Salesforce Inc.',     domain: 'salesforce.com',    daily: 0.13, risk: 2 },
}

// Static fallback so Stocks category always has data even if Finnhub is down / rate-limited
const STATIC_STOCKS = STOCK_TICKERS.map(sym => {
  const meta = STOCK_META[sym]
  const prices: Record<string, number> = {
    AAPL:190, MSFT:415, NVDA:875, TSLA:248, AMZN:185,
    GOOGL:175, META:495, JPM:198, V:268, WMT:68,
    NFLX:618, AMD:158, PYPL:68, UBER:72, CRM:285,
  }
  return {
    id: sym.toLowerCase(),
    symbol: sym,
    name: meta?.name ?? sym,
    category: 'Stocks',
    price: prices[sym] ?? 100,
    change24h: 0,
    image: `https://logo.clearbit.com/${meta?.domain ?? ''}`,
    spark: [] as number[],
    dailyReturn: String(meta?.daily ?? 0.12),
    riskLevel: meta?.risk ?? 2,
    minInvestment: 100,
  }
})

async function getStocksData() {
  const finnhubKey = process.env.FINNHUB_API_KEY
  if (!finnhubKey) return STATIC_STOCKS
  return fetchWithCache('stocks', async () => {
    const results = await Promise.allSettled(
      STOCK_TICKERS.map(sym =>
        axios.get<{ c: number; dp: number }>(
          `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${finnhubKey}`,
          { timeout: 10_000 }
        ).then(r => ({ symbol: sym, ...r.data }))
      )
    )
    const live = results
      .filter((r): r is PromiseFulfilledResult<{ symbol: string; c: number; dp: number }> =>
        r.status === 'fulfilled' && r.value?.c > 0
      )
      .map(r => {
        const { symbol, c: price, dp: changePercent } = r.value
        const meta = STOCK_META[symbol]
        return {
          id: symbol.toLowerCase(),
          symbol,
          name: meta?.name ?? symbol,
          category: 'Stocks',
          price,
          change24h: changePercent ?? 0,
          image: `https://logo.clearbit.com/${meta?.domain ?? ''}`,
          spark: [] as number[],
          dailyReturn: String(meta?.daily ?? 0.12),
          riskLevel: meta?.risk ?? 2,
          minInvestment: 100,
        }
      })
    // Fall back to static prices for any ticker Finnhub didn't return
    const liveIds = new Set(live.map(s => s.id))
    const extras  = STATIC_STOCKS.filter(s => !liveIds.has(s.id))
    return [...live, ...extras]
  })
}

// ─── DeFi (DefiLlama) ─────────────────────────────────────────────────────────

async function getDeFiData() {
  return fetchWithCache('defi', async () => {
    const res = await axios.get('https://api.llama.fi/protocols', { timeout: 10_000 })
    return (res.data as any[])
      .filter(p => (p.tvl ?? 0) > 500_000_000)
      .slice(0, 10)
      .map((p, i) => ({
        id: p.slug as string,
        symbol: ((p.symbol || p.name) as string).slice(0, 8).toUpperCase(),
        name: p.name as string,
        category: 'DeFi',
        price: p.tvl as number,
        change24h: (p.change_1d as number) ?? 0,
        image: (p.logo as string) ?? '',
        spark: [] as number[],
        dailyReturn: String(Number((0.65 + (i % 6) * 0.05).toFixed(2))),
        riskLevel: 5,
        minInvestment: 500,
      }))
  })
}

// ─── Forex (Frankfurter) ──────────────────────────────────────────────────────

const FOREX_META: Record<string, { daily: number; flag: string }> = {
  EUR: { daily: 0.09, flag: 'eu' }, GBP: { daily: 0.10, flag: 'gb' },
  JPY: { daily: 0.07, flag: 'jp' }, CHF: { daily: 0.08, flag: 'ch' },
  CAD: { daily: 0.08, flag: 'ca' }, AUD: { daily: 0.09, flag: 'au' },
}

async function getForexData() {
  return fetchWithCache('forex', async () => {
    const res = await axios.get('https://api.frankfurter.dev/v1/latest?from=USD', { timeout: 10_000 })
    const rates = res.data.rates as Record<string, number>
    return Object.keys(FOREX_META)
      .filter(c => rates[c])
      .map(currency => ({
        id: `forex-${currency.toLowerCase()}`,
        symbol: `USD/${currency}`,
        name: `US Dollar / ${currency}`,
        category: 'Forex',
        price: rates[currency],
        change24h: 0,
        image: `https://flagcdn.com/w40/${FOREX_META[currency].flag}.png`,
        spark: [] as number[],
        dailyReturn: String(FOREX_META[currency].daily),
        riskLevel: 2,
        minInvestment: 50,
      }))
  })
}

// ─── Bonds ────────────────────────────────────────────────────────────────────

const STATIC_BONDS = [
  { id: 'us-10y',  symbol: 'US10Y', name: 'US 10Y Treasury', category: 'Bonds', price: 4.38, change24h: -0.02, image: '', spark: [] as number[], dailyReturn: '0.05', riskLevel: 1, minInvestment: 1000 },
  { id: 'corp-ig', symbol: 'CORP',  name: 'Corp Bond (IG)',  category: 'Bonds', price: 5.20, change24h:  0.01, image: '', spark: [] as number[], dailyReturn: '0.07', riskLevel: 2, minInvestment: 500  },
  { id: 'hi-yield',symbol: 'HYG',   name: 'High Yield Bond', category: 'Bonds', price: 7.40, change24h:  0.05, image: '', spark: [] as number[], dailyReturn: '0.10', riskLevel: 3, minInvestment: 250  },
]

async function getBondsData() {
  const fredKey = process.env.FRED_API_KEY
  if (!fredKey) return STATIC_BONDS
  return fetchWithCache('bonds', async () => {
    const res = await axios.get(
      `https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${fredKey}&file_type=json&sort_order=desc&limit=1`,
      { timeout: 10_000 }
    )
    const obs = (res.data?.observations as any[])?.[0]
    if (!obs) return STATIC_BONDS
    return [{ ...STATIC_BONDS[0], price: parseFloat(obs.value) }, ...STATIC_BONDS.slice(1)]
  })
}

// ─── Commodities (static) ─────────────────────────────────────────────────────

const COMMODITIES = [
  { id: 'gold',   symbol: 'XAU', name: 'Gold',            category: 'Commodities', price: 3320,  change24h:  0.48, image: 'https://assets.coingecko.com/coins/images/32234/small/xaut.png', spark: [3200,3240,3260,3280,3300,3310,3320] as number[], dailyReturn: '0.22', riskLevel: 2, minInvestment: 100 },
  { id: 'silver', symbol: 'XAG', name: 'Silver',          category: 'Commodities', price: 33.50, change24h:  0.82, image: '', spark: [32.0,32.5,32.8,33.0,33.1,33.3,33.5] as number[], dailyReturn: '0.18', riskLevel: 2, minInvestment: 100 },
  { id: 'wti',    symbol: 'WTI', name: 'Crude Oil (WTI)', category: 'Commodities', price: 72.40, change24h: -1.20, image: '', spark: [74.0,73.5,73.0,72.5,72.2,72.3,72.4] as number[], dailyReturn: '0.28', riskLevel: 4, minInvestment: 200 },
]

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const category = new URL(req.url).searchParams.get('category') ?? 'All'

  const [cryptoR, defiR, stocksR, forexR, bondsR] = await Promise.allSettled([
    getCryptoData(), getDeFiData(), getStocksData(), getForexData(), getBondsData(),
  ])

  const safe = (r: PromiseSettledResult<unknown[] | null>): unknown[] =>
    r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []

  const all = [
    ...safe(cryptoR), ...safe(defiR), ...safe(stocksR),
    ...safe(forexR),  ...safe(bondsR), ...COMMODITIES,
  ].map((a: any) => ({
    ...a,
    plans: buildPlans(a.id, a.category, parseFloat(a.dailyReturn) || 0.5, a.minInvestment || 100),
  }))

  const filtered = category === 'All' ? all : all.filter((a: any) => a.category === category)
  const hot = all.filter((a: any) => Math.abs(a.change24h as number) > 2).slice(0, 10)

  return NextResponse.json({ assets: filtered, hot, total: filtered.length, timestamp: Date.now() })
}
