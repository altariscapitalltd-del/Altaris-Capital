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
