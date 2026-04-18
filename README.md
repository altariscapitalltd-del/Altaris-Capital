# Altaris Capital — Full-Stack Investment Platform

A production-ready fintech PWA built with Next.js 14, Prisma + PostgreSQL, and real-time notifications.

## Stack
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes + custom Node.js server
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT (httpOnly cookies) + Email OTP
- **Real-time**: Pusher channels for market, chat, and notifications
- **PWA**: Service Worker + Web Push (VAPID)

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

Required environment variables:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/altaris_capital
JWT_SECRET=<random 64-char string>
ADMIN_JWT_SECRET=<another random 64-char string>
GMAIL_USER=<smtp account email>
GMAIL_APP_PASSWORD=<smtp app password>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<from web-push generate-vapid-keys>
VAPID_PRIVATE_KEY=<from web-push generate-vapid-keys>
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000
HOST=0.0.0.0
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

Seed overrides (recommended for local customization):
```env
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=<strong password>
SEED_DEMO_EMAIL=demo@example.com
SEED_DEMO_PASSWORD=<strong password>
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


### 6. Preview on iPhone Safari (same Wi-Fi)
1. Start the app on your computer:
```bash
npm run dev
```
2. In terminal, copy the printed LAN URL (example: `http://192.168.1.25:3000`).
3. On your iPhone (Safari), open that LAN URL.

If it does not load, ensure:
- phone and computer are on the same network,
- local firewall allows port `3000`,
- `HOST=0.0.0.0` is set (already default in this project).

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

## Security Notes
- Never commit real secrets or credentials to source control.
- All credentials must be injected via environment variables.
- Seed credentials should be overridden via `SEED_*` env vars in shared/dev environments.
- API input validation is enforced on critical financial and admin mutation routes.

## Recent Upgrade Highlights
- Hardened critical API routes with strict schema validation (admin auth, deposits, withdrawals, OTP, wallet settings).
- Added idempotency protections for admin deposit approval to prevent duplicate balance credits.
- Corrected balance snapshot creation to persist the exact post-update balance.
- Added strict upload validation (type/extension/size) for profile avatars and KYC documents.
- Removed hardcoded credential examples and improved secure setup guidance.
- Refreshed the in-app Home dashboard UI with upgraded portfolio header, richer quick-action cards, and polished market/KYC surfaces for better mobile readability.
- Reworked Wallet UX with a cleaner balance hero + mini trend chart, deposit-first crypto/fiat flow, branded QR receive card, and recent activity summaries.
- Wallet flow now opens with neutral state (no auto-selected action), introduces full-screen crypto receive dashboard, and adds a premium referral rewards dashboard.
- iOS PWA header safe-area handling was tightened so content no longer leaks into the status-bar region.
- Market chart endpoint now falls back to CoinGecko OHLC to keep candlestick charts visible when exchange pairs are unavailable.
- Profile image uploads now accept modern iPhone formats (HEIC/HEIF) in addition to JPEG/PNG/WebP.
- Wallet actions were refined for mobile: Deposit now reveals Crypto/Fiat only on click and auto-hides after 10s if untouched, while Withdraw and Rewards open as dedicated full-screen dashboards.
- Wallet quick action label updated from “My Invest” to “Invested” for clearer navigation.
- Profile avatar validation now supports iOS uploads that omit MIME type by securely validating extension fallback.
- Candlestick chart visuals were upgraded with animated scanline/grid motion for a more live exchange-style feel.
- Fixed installed-PWA layout layering across mobile by moving content into a dedicated scroll region under a measured fixed header and above fixed bottom navigation (safe-area aware for iOS/Android standalone mode).
- Added dynamic header-height offset logic with CSS viewport-safe containers (`100dvh`/`100svh`) so dashboard content never renders behind the status bar.
- Replaced emoji-based UI markers throughout the app/admin surfaces with SVG/text equivalents for a cleaner, consistent visual system.
- Added a minimal website explainer video section (`/videos/altaris-explainer.mp4`) in the marketing landing page.
- Restored full website scrolling by decoupling root shell layout from the in-app fixed-header container so only authenticated app pages use the constrained mobile app viewport shell.
- Wallet fiat deposit now offers six selectable providers (MoonPay, Ramp, Transak, Alchemy Pay, Mercuryo, Onramper) and crypto receive QR size was reduced for cleaner/faster rendering.
- Market chain chart now supports zoom controls (buttons + slider + wheel zoom) for trading-style inspection.
- Profile save now includes a resilient fallback path: if avatar upload request fails, the app retries a JSON profile update so core details still save.
- Wallet portfolio mini-chart now uses deterministic transaction/balance-derived data instead of random noise for more accurate motion.
- Home crypto and top-mover sections now use live provider market data (not placeholder rows).
- Improved chat message alignment and settings interactivity (push toggle wiring, notification preferences UX).
