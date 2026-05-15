import { NextResponse } from 'next/server'

const COIN_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  XRP: 'ripple',
  SOL: 'solana',
  BNB: 'binancecoin',
  GOLD: 'tether-gold',
  SPX: 'spx6900',
  EURUSD: 'tether-eurt',
  GBPUSD: 'poundtoken',
  USDJPY: 'jpy-coin',
  USDCHF: 'franc',
  USDCAD: 'cad-coin',
  AAPL: 'apple-token',
  NVDA: 'nvidia-token',
  TSLA: 'tesla-token',
  MSFT: 'microsoft-token',
}

export async function GET() {
  try {
    const ids = Object.values(COIN_IDS).join(',')
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 30 } }
    )
    const data = await res.json()

    const prices: Record<string, { price: number; change: number }> = {}
    Object.entries(COIN_IDS).forEach(([sym, id]) => {
      const item = data[id]
      if (item) {
        prices[sym] = {
          price: item.usd || 0,
          change: item.usd_24h_change || 0,
        }
      }
    })

    // Fallback data for key assets if API fails
    if (Object.keys(prices).length === 0) {
      return NextResponse.json({
        prices: {
          BTC: { price: 108420, change: 2.34 },
          ETH: { price: 3650, change: 1.87 },
          XRP: { price: 2.45, change: 5.12 },
          SOL: { price: 198, change: 3.56 },
          BNB: { price: 720, change: 0.89 },
          GOLD: { price: 2650, change: 0.45 },
          SPX: { price: 5980, change: 0.67 },
          EURUSD: { price: 1.0845, change: -0.23 },
          GBPUSD: { price: 1.2740, change: 0.15 },
          USDJPY: { price: 149.82, change: -0.45 },
        }
      })
    }

    return NextResponse.json({ prices })
  } catch {
    return NextResponse.json({
      prices: {
        BTC: { price: 108420, change: 2.34 },
        ETH: { price: 3650, change: 1.87 },
        XRP: { price: 2.45, change: 5.12 },
        SOL: { price: 198, change: 3.56 },
        BNB: { price: 720, change: 0.89 },
        GOLD: { price: 2650, change: 0.45 },
        SPX: { price: 5980, change: 0.67 },
        EURUSD: { price: 1.0845, change: -0.23 },
        GBPUSD: { price: 1.2740, change: 0.15 },
        USDJPY: { price: 149.82, change: -0.45 },
      }
    })
  }
}
