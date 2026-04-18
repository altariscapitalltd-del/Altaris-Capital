import { NextRequest, NextResponse } from 'next/server'

const CACHE: Record<string, { ts: number; data: { times: number[]; values: number[]; open?: number[]; high?: number[]; low?: number[] } }> = {}
const CACHE_TTL = 30_000

const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  LINK: 'chainlink',
  LTC: 'litecoin',
  MATIC: 'matic-network',
  TRX: 'tron',
  TON: 'the-open-network',
}

function mapDaysToCg(days: number) {
  if (days <= 1) return '1'
  if (days <= 7) return '7'
  if (days <= 30) return '30'
  if (days <= 90) return '90'
  return '180'
}

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
    if (!res.ok) throw new Error('Binance unavailable')
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No chart data')
    }
    const times = data.map((d: any) => d[0])
    const values = data.map((d: any) => parseFloat(d[4]))
    const open = data.map((d: any) => parseFloat(d[1]))
    const high = data.map((d: any) => parseFloat(d[2]))
    const low = data.map((d: any) => parseFloat(d[3]))
    const payload = { times, values, open, high, low }
    CACHE[cacheKey] = { ts: Date.now(), data: payload }
    return NextResponse.json(payload)
  } catch {
    try {
      const cgId = COINGECKO_ID_MAP[symbol.toUpperCase()]
      if (!cgId) {
        return NextResponse.json({ times: [], values: [], open: [], high: [], low: [] })
      }

      const cgDays = mapDaysToCg(days)
      const cgUrl = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(cgId)}/ohlc?vs_currency=usd&days=${cgDays}`
      const cgRes = await fetch(cgUrl, { next: { revalidate: 30 } })
      if (!cgRes.ok) throw new Error('CoinGecko unavailable')
      const rows = await cgRes.json()
      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ times: [], values: [], open: [], high: [], low: [] })
      }

      const normalized = rows.slice(-Math.max(24, Math.min(rows.length, days * (days <= 7 ? 24 : 6))))
      const times = normalized.map((r: any[]) => Number(r[0]))
      const open = normalized.map((r: any[]) => Number(r[1]))
      const high = normalized.map((r: any[]) => Number(r[2]))
      const low = normalized.map((r: any[]) => Number(r[3]))
      const values = normalized.map((r: any[]) => Number(r[4]))

      const payload = { times, values, open, high, low }
      CACHE[cacheKey] = { ts: Date.now(), data: payload }
      return NextResponse.json(payload)
    } catch {
      return NextResponse.json({ error: 'Chart unavailable' }, { status: 502 })
    }
  }
}
