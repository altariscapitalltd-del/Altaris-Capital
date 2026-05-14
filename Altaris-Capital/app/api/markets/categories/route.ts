import { NextResponse } from 'next/server'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const CACHE_MS = 5 * 60 * 1000 // 5 min
let cache: { data: any; ts: number } | null = null

export async function GET() {
  if (cache && cache.ts + CACHE_MS > Date.now()) {
    return NextResponse.json(cache.data)
  }
  try {
    const res = await fetch(`${COINGECKO_BASE}/coins/categories?order=market_cap_desc`, {
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error('CoinGecko error')
    const raw = await res.json()
    const categories = Array.isArray(raw)
      ? raw.map((c: any) => ({ id: c.id || '', name: c.name || '' })).filter((c: any) => c.id && c.name)
      : []
    const data = { categories }
    cache = { data, ts: Date.now() }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ categories: [] }, { status: 200 })
  }
}
