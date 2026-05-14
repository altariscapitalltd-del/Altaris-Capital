import { NextRequest, NextResponse } from 'next/server'

let cache: { data: any; ts: number } | null = null
const CACHE_TTL = 30000

export async function GET(req: NextRequest) {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data)
  }
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple&vs_currencies=usd&include_24hr_change=true',
      { next: { revalidate: 30 } }
    )
    if (!res.ok) throw new Error('CoinGecko error')
    const raw = await res.json()
    const data = {
      BTC: { price: raw.bitcoin?.usd,      change24h: raw.bitcoin?.usd_24h_change },
      ETH: { price: raw.ethereum?.usd,     change24h: raw.ethereum?.usd_24h_change },
      BNB: { price: raw.binancecoin?.usd,  change24h: raw.binancecoin?.usd_24h_change },
      SOL: { price: raw.solana?.usd,       change24h: raw.solana?.usd_24h_change },
      XRP: { price: raw.ripple?.usd,       change24h: raw.ripple?.usd_24h_change },
      updatedAt: new Date().toISOString(),
    }
    cache = { data, ts: Date.now() }
    return NextResponse.json(data)
  } catch {
    // Fallback static prices if CoinGecko is down
    return NextResponse.json({
      BTC: { price: 65420.55, change24h: 2.34 },
      ETH: { price: 3421.18, change24h: 1.78 },
      BNB: { price: 562.44, change24h: -0.55 },
      SOL: { price: 148.91, change24h: 3.21 },
      XRP: { price: 0.6312, change24h: -1.12 },
      updatedAt: new Date().toISOString(),
    })
  }
}
