import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'

const FINNHUB_KEY = process.env.FINNHUB_API_KEY
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY
const FRED_KEY = process.env.FRED_API_KEY

// Cache structure
let _cache: Record<string, { data: any; ts: number }> = {}
const TTL = 5 * 60 * 1000 // 5 minutes

async function fetchWithCache(key: string, fetcher: () => Promise<any>) {
  if (_cache[key] && _cache[key].ts + TTL > Date.now()) {
    return _cache[key].data
  }
  try {
    const data = await fetcher()
    if (data) {
      _cache[key] = { data, ts: Date.now() }
    }
    return data
  } catch (error) {
    console.error(`Error fetching ${key}:`, error)
    return _cache[key]?.data || null
  }
}

async function getCryptoData() {
  return fetchWithCache('crypto', async () => {
    try {
      const res = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: 50, page: 1, sparkline: true }
      })
      return res.data.map((c: any) => ({
        id: c.id,
        symbol: c.symbol.toUpperCase(),
        name: c.name,
        category: 'Crypto',
        price: c.current_price,
        change24h: c.price_change_percentage_24h || 0,
        image: c.image,
        spark: c.sparkline_in_7d?.price || [],
        marketCap: c.market_cap,
        dailyReturn: (Math.random() * 2 + 0.5).toFixed(2),
        annualReturn: (Math.random() * 50 + 10).toFixed(2),
        riskLevel: (c.price_change_percentage_24h || 0) > 5 ? 5 : (c.price_change_percentage_24h || 0) > 2 ? 4 : 3,
        minInvestment: 100
      }))
    } catch (e) {
      console.error("CoinGecko error", e)
      return []
    }
  })
}

async function getDeFiData() {
  return fetchWithCache('defi', async () => {
    try {
      const res = await axios.get('https://api.llama.fi/protocols')
      return res.data.slice(0, 30).map((p: any) => ({
        id: p.slug,
        symbol: p.symbol,
        name: p.name,
        category: 'DeFi',
        price: p.tvl,
        change24h: p.change_1d || 0,
        image: p.logo,
        spark: [],
        dailyReturn: (Math.random() * 3 + 1).toFixed(2),
        annualReturn: (Math.random() * 100 + 20).toFixed(2),
        riskLevel: 5,
        minInvestment: 500
      }))
    } catch (e) {
      console.error("DefiLlama error", e)
      return []
    }
  })
}

async function getForexData() {
  return fetchWithCache('forex', async () => {
    try {
      const res = await axios.get('https://www.frankfurter.app/latest?from=USD')
      const rates = res.data.rates
      return Object.keys(rates).map(currency => ({
        id: `forex-${currency}`,
        symbol: `USD/${currency}`,
        name: `${currency} Exchange Rate`,
        category: 'Forex',
        price: rates[currency],
        change24h: (Math.random() * 0.5 - 0.25).toFixed(2),
        image: `https://flagcdn.com/w40/${currency.toLowerCase().slice(0, 2)}.png`,
        spark: [],
        dailyReturn: (Math.random() * 0.2 + 0.05).toFixed(2),
        annualReturn: (Math.random() * 5 + 2).toFixed(2),
        riskLevel: 1,
        minInvestment: 50
      }))
    } catch (e) {
      console.error("Frankfurter error", e)
      return []
    }
  })
}

async function getBondsData() {
  if (!FRED_KEY) return []
  return fetchWithCache('bonds', async () => {
    try {
      const res = await axios.get(`https://api.stlouisfed.org/fred/series/observations?series_id=DGS10&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=1`)
      if (!res.data.observations || res.data.observations.length === 0) return []
      const yieldValue = parseFloat(res.data.observations[0].value)
      return [{
        id: 'us-10y-bond',
        symbol: 'US10Y',
        name: 'US 10-Year Treasury Bond',
        category: 'Bonds',
        price: yieldValue,
        change24h: 0,
        image: 'https://www.stlouisfed.org/~/media/Images/FRED/fred_logo_200.png',
        spark: [],
        dailyReturn: (yieldValue / 365).toFixed(4),
        annualReturn: yieldValue.toFixed(2),
        riskLevel: 1,
        minInvestment: 1000
      }]
    } catch (e) {
      console.error("FRED error", e)
      return []
    }
  })
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || 'All'
    
    const results = await Promise.allSettled([
      getCryptoData(),
      getDeFiData(),
      getForexData(),
      getBondsData()
    ])
    
    let allAssets: any[] = []
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        allAssets = [...allAssets, ...result.value]
      }
    })
    
    // Filter by category
    let filtered = category === 'All' ? allAssets : allAssets.filter(a => a.category === category)
    
    // HOT section logic (trending)
    const hot = allAssets.filter(a => Math.abs(a.change24h) > 3).slice(0, 10)
    
    return NextResponse.json({
      assets: filtered,
      hot: hot,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error("API Route Error:", error)
    return NextResponse.json({ assets: [], hot: [], error: "Internal Server Error" }, { status: 500 })
  }
}
