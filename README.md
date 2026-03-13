# Altaris Capital — Full-Stack Investment Platform

A production-ready fintech PWA built with Next.js 14, Socket.IO, Prisma + PostgreSQL.

## Stack
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes + custom Node.js server with Socket.IO
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT (httpOnly cookies) + Email OTP (Gmail SMTP)
- **Real-time**: Socket.IO (live prices, chat, notifications)
- **PWA**: Service Worker, Web Push (VAPID)

## Quick Start

### 1. Clone & Install
```bash
npm install
```

### 2. Environment Variables
```bash
cp .env.example .env
# Fill in all values in .env
```

Required env vars:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/altaris_capital
JWT_SECRET=<random 64-char string>
ADMIN_JWT_SECRET=<another random 64-char string>
GMAIL_USER=altariscapital.ltd@gmail.com
GMAIL_APP_PASSWORD=byqj wvxs atim qilw
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<from web-push generate-vapid-keys>
VAPID_PRIVATE_KEY=<from web-push generate-vapid-keys>
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000
```

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

### 3. Database Setup
```bash
# Push schema to database
npm run db:push

# Run seed (creates admin + demo user)
npm run db:seed
```

### 4. PWA Icons
Generate icons from the SVG:
```bash
npm install -g pwa-asset-generator
npx pwa-asset-generator public/icons/icon.svg public/icons --icon-only --favicon
```
Or manually place PNG files sized 72, 96, 128, 144, 152, 192, 512 in `public/icons/`.

### 5. Run
```bash
# Development
npm run dev

# Production
npm run build && npm start
```

## Default Credentials
| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@altariscapital.ltd | Admin@Altaris2024! |
| Demo  | demo@altariscapital.ltd  | Demo@123456 |

## URLs
- **App**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin/login

## Deposit Wallet Addresses (defaults)
| Currency | Address |
|----------|---------|
| BTC | bc1qx0f66y2gcw20n25k7tj9yfalw04gah493plz9x |
| ETH | 0x3913a2c83a41090A84B72169e9066506d7942e01 |
| USDT | 0x3913a2c83a41090A84B72169e9066506d7942e01 |

Addresses are manageable from Admin → Settings.

## Features
- ✅ Email OTP verification (signup + 2FA)
- ✅ 10 Investment plans with real-time ROI calculations
- ✅ Deposit flow (user submits TX hash → admin confirms → balance credited)
- ✅ Withdrawal flow (KYC required → admin processes)
- ✅ Live market prices via CoinGecko + Socket.IO broadcast
- ✅ KYC document upload + admin review
- ✅ Live support chat (WebSocket, user ↔ admin)
- ✅ Web Push Notifications (VAPID)
- ✅ Admin panel: user management, balance adjustments, KYC, deposits
- ✅ Location tracking (browser geolocation + IP fallback)
- ✅ PWA with offline support + install prompt
- ✅ Audit logs for all admin actions

# Altaris-Capital
