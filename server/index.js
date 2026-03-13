const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const Pusher = require('pusher')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || '',
  useTLS: true,
})

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true)
    await handle(req, res, parsedUrl)
  })

  // Broadcast market data every ~5–8 seconds, with staggered per-asset emits
  let priceCache = {}
  const PRICE_INTERVAL_MS = 6000
  const MARKET_CHANNEL = 'public-market'

  setInterval(async () => {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple&vs_currencies=usd&include_24hr_change=true'
      ).catch(() => null)
      if (!res || !res.ok) return

      const data = await res.json()
      priceCache = {
        BTC: { price: data.bitcoin?.usd, change24h: data.bitcoin?.usd_24h_change },
        ETH: { price: data.ethereum?.usd, change24h: data.ethereum?.usd_24h_change },
        BNB: { price: data.binancecoin?.usd, change24h: data.binancecoin?.usd_24h_change },
        SOL: { price: data.solana?.usd, change24h: data.solana?.usd_24h_change },
        XRP: { price: data.ripple?.usd, change24h: data.ripple?.usd_24h_change },
        updatedAt: new Date().toISOString(),
      }

      const assets = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP']
      const baseDelay = 0
      const maxJitter = 2000 // up to 2s jitter so updates feel random

      assets.forEach((sym, index) => {
        const jitter = Math.floor(Math.random() * maxJitter)
        const delay = baseDelay + index * 400 + jitter
        setTimeout(() => {
          if (!priceCache[sym]) return
          pusher.trigger(MARKET_CHANNEL, 'price:update:asset', { symbol: sym, data: priceCache[sym], updatedAt: priceCache.updatedAt })
        }, delay)
      })

      // Also emit full snapshot occasionally for clients that prefer batch updates
      pusher.trigger(MARKET_CHANNEL, 'price:update', priceCache)
    } catch (e) {
      if (dev) console.error('[WS] price update failed', e)
    }
  }, PRICE_INTERVAL_MS)

  httpServer.listen(port, () => {
    console.log(`> Altaris Capital running on http://${hostname}:${port}`)
  })
})
