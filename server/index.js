const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true)
    await handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  })

  // Attach io to global so API routes can access it
  global.io = io

  io.on('connection', (socket) => {
    if (dev) console.log('[WS] Client connected:', socket.id)

    socket.on('join', (userId) => {
      socket.join(`user:${userId}`)
      if (dev) console.log(`[WS] User ${userId} joined room`)
    })

    socket.on('join:admin', () => {
      socket.join('admin')
      if (dev) console.log('[WS] Admin joined room')
    })

    socket.on('chat:message', async (data) => {
      io.to(`user:${data.userId}`).emit('chat:message', data)
      io.to('admin').emit('chat:message', data)
    })

    socket.on('disconnect', () => {
      if (dev) console.log('[WS] Client disconnected:', socket.id)
    })
  })

  // Broadcast market data every ~5–8 seconds, with staggered per-asset emits
  let priceCache = {}
  const PRICE_INTERVAL_MS = 6000

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
          io.emit('price:update:asset', { symbol: sym, data: priceCache[sym], updatedAt: priceCache.updatedAt })
        }, delay)
      })

      // Also emit full snapshot occasionally for clients that prefer batch updates
      io.emit('price:update', priceCache)
    } catch (e) {
      if (dev) console.error('[WS] price update failed', e)
    }
  }, PRICE_INTERVAL_MS)

  httpServer.listen(port, () => {
    console.log(`> Altaris Capital running on http://${hostname}:${port}`)
  })
})
