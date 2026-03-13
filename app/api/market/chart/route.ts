import { NextRequest, NextResponse } from 'next/server'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'

const SYMBOL_TO_ID: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  bnb: 'binancecoin',
  sol: 'solana',
  xrp: 'ripple',
  ada: 'cardano',
  doge: 'dogecoin',
  matic: 'matic-network',
  dot: 'polkadot',
  avax: 'avalanche-2',
  link: 'chainlink',
  uni: 'uniswap',
  atom: 'cosmos',
  ltc: 'litecoin',
  etc: 'ethereum-classic',
  xlm: 'stellar',
  bch: 'bitcoin-cash',
  near: 'near',
  algo: 'algorand',
  vet: 'vechain',
  fil: 'filecoin',
  trx: 'tron',
  apt: 'aptos',
  arb: 'arbitrum',
  op: 'optimism',
  inj: 'injective-protocol',
  sui: 'sui',
  sei: 'sei-network',
  wif: 'dogwifcoin',
  pepe: 'pepe',
  shib: 'shiba-inu',
  floki: 'floki',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  let id = (searchParams.get('id') || '').toLowerCase()
  const symbol = (searchParams.get('symbol') || '').toLowerCase()
  const days = Math.min(180, Math.max(1, parseInt(searchParams.get('days') || '7', 10)))

  if (!id && symbol) id = SYMBOL_TO_ID[symbol] || symbol
  if (!id) return NextResponse.json({ error: 'Missing id or symbol' }, { status: 400 })

  try {
    const url = `${COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}`
    const res = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const data = await res.json()
    const prices = data.prices
    if (!Array.isArray(prices) || prices.length === 0) {
      return NextResponse.json({ times: [], values: [] })
    }
    const times = prices.map((p: number[]) => p[0])
    const values = prices.map((p: number[]) => p[1])
    return NextResponse.json({ times, values })
  } catch {
    return NextResponse.json({ error: 'Chart unavailable' }, { status: 502 })
  }
}
