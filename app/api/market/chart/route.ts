import { NextRequest, NextResponse } from 'next/server'

const CACHE: Record<string, { ts: number; data: { times: number[]; values: number[] } }> = {}
const CACHE_TTL = 30_000

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = (searchParams.get('symbol') || '').toLowerCase()
  const days = Math.min(180, Math.max(1, parseInt(searchParams.get('days') || '7', 10)))

  if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 })

  const binanceSymbol = `${symbol.toUpperCase()}USDT`
  let interval = '1d'
  if (days <= 7) interval = '1h'
  else if (days <= 30) interval = '4h'

  const cacheKey = `${binanceSymbol}-${interval}-${days}`
  if (CACHE[cacheKey] && Date.now() - CACHE[cacheKey].ts < CACHE_TTL) {
    return NextResponse.json(CACHE[cacheKey].data)
  }

  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(binanceSymbol)}&interval=${interval}&limit=${days}`
    const res = await fetch(url, { next: { revalidate: 30 } })
    if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ times: [], values: [] })
    }
    const times = data.map((d: any) => d[0])
    const values = data.map((d: any) => parseFloat(d[4]))
    const payload = { times, values }
    CACHE[cacheKey] = { ts: Date.now(), data: payload }
    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ error: 'Chart unavailable' }, { status: 502 })
  }
}
