// server.js — Custom Next.js server with Pusher for realtime updates
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const Pusher = require('pusher');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Market price cache
let latestPrices = {};

// Fetch prices from CoinGecko
async function fetchMarketPrices() {
  try {
    const ids = 'bitcoin,ethereum,binancecoin,solana,ripple';
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );
    if (!res.ok) return;
    const data = await res.json();
    latestPrices = {
      BTC: { price: data.bitcoin?.usd, change24h: data.bitcoin?.usd_24h_change },
      ETH: { price: data.ethereum?.usd, change24h: data.ethereum?.usd_24h_change },
      BNB: { price: data.binancecoin?.usd, change24h: data.binancecoin?.usd_24h_change },
      SOL: { price: data.solana?.usd, change24h: data.solana?.usd_24h_change },
      XRP: { price: data.ripple?.usd, change24h: data.ripple?.usd_24h_change },
      updatedAt: new Date().toISOString(),
    };
    return latestPrices;
  } catch (err) {
    console.error('[Market] Price fetch error:', err.message);
  }
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID || '',
    key: process.env.PUSHER_KEY || '',
    secret: process.env.PUSHER_SECRET || '',
    cluster: process.env.PUSHER_CLUSTER || '',
    useTLS: true,
  });

  // Make latest prices accessible to other parts of the app
  global._latestPrices = latestPrices;

  // Note: chat messages are handled via API routes; clients communicate through Pusher.

  // Broadcast price updates every 30 seconds
  const MARKET_CHANNEL = 'public-market'

  async function broadcastPrices() {
    const prices = await fetchMarketPrices();
    if (prices) {
      global._latestPrices = prices;
      pusher.trigger(MARKET_CHANNEL, 'price:update', prices);
    }
  }

  // Initial fetch then interval
  broadcastPrices();
  setInterval(broadcastPrices, 30000);

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Altaris Capital running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server active on /api/socket`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  });
});
