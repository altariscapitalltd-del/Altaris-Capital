// server.js — Custom Next.js server with Socket.IO WebSocket support
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

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

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  // Make io globally accessible to API routes
  global._io = io;
  global._latestPrices = latestPrices;

  io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    // Authenticate user
    const userId = socket.handshake.auth?.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[Socket] User ${userId} joined their room`);
    }

    // Admins join admin room
    const isAdmin = socket.handshake.auth?.isAdmin;
    if (isAdmin) {
      socket.join('admin');
      console.log('[Socket] Admin joined admin room');
    }

    // Send current prices immediately on connect
    if (Object.keys(latestPrices).length > 0) {
      socket.emit('price:update', latestPrices);
    }

    // Chat events
    socket.on('chat:message', async (data) => {
      const { conversationId, content, sender } = data;
      // Broadcast to relevant parties
      if (sender === 'user') {
        io.to('admin').emit('chat:new_message', { conversationId, content, sender, userId });
      } else if (sender === 'admin') {
        io.to(`user:${data.userId}`).emit('chat:new_message', { conversationId, content, sender });
      }
    });

    socket.on('chat:typing', (data) => {
      const { conversationId, sender } = data;
      if (sender === 'admin') {
        io.to(`user:${data.userId}`).emit('chat:typing', { conversationId });
      }
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Client disconnected:', socket.id);
    });
  });

  // Broadcast price updates every 30 seconds
  async function broadcastPrices() {
    const prices = await fetchMarketPrices();
    if (prices) {
      global._latestPrices = prices;
      io.emit('price:update', prices);
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
