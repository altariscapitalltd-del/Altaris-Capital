import { NextRequest, NextResponse } from 'next/server'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const CACHE_MS = 60 * 1000 // 1 min
let cache: { data: any; ts: number; category?: string } | null = null

function formatVol(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`
  return `$${n.toFixed(0)}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('category_id') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const perPage = Math.min(250, Math.max(10, parseInt(searchParams.get('per_page') || '100', 10)))

  const cacheKey = categoryId || 'default'
  if (cache && cache.ts + CACHE_MS > Date.now() && (cache.category || '') === cacheKey) {
    return NextResponse.json(cache.data)
  }

  try {
    const url = new URL(`${COINGECKO_BASE}/coins/markets`)
    url.searchParams.set('vs_currency', 'usd')
    url.searchParams.set('order', 'market_cap_desc')
    url.searchParams.set('per_page', String(perPage))
    url.searchParams.set('page', String(page))
    url.searchParams.set('sparkline', 'true')
    if (categoryId) url.searchParams.set('category', categoryId)

    const res = await fetch(url.toString(), { next: { revalidate: 60 } })
    if (!res.ok) throw new Error('CoinGecko error')
    const raw = await res.json()

    const list = Array.isArray(raw)
      ? raw.map((c: any) => ({
          id: c.id,
          symbol: (c.symbol || '').toUpperCase(),
          name: c.name || '',
          image: c.image || '',
          price: c.current_price ?? 0,
          change24h: c.price_change_percentage_24h ?? 0,
          volume: c.total_volume ?? 0,
          volumeFormatted: formatVol(c.total_volume ?? 0),
          marketCap: c.market_cap ?? 0,
          marketCapRank: c.market_cap_rank ?? 999,
          spark: Array.isArray(c.sparkline_in_7d?.price) ? c.sparkline_in_7d.price : [],
        }))
      : []

    const data = { list, nextPage: raw.length >= perPage ? page + 1 : null }
    cache = { data, ts: Date.now(), category: cacheKey }
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ list: [], nextPage: null }, { status: 200 })
  }
}
