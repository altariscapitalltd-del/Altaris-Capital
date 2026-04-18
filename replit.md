# Altaris Capital

A Next.js 14 investment platform with real-time market data, user authentication, push notifications, full referral/rewards system, and admin command center.

## Architecture

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: JWT-based (custom, no NextAuth)
- **Real-time**: Pusher Channels for live market prices and chat
- **Push Notifications**: Firebase FCM
- **File Storage**: Vercel Blob (BLOB_READ_WRITE_TOKEN)
- **Styling**: Tailwind CSS + Radix UI components
- **Package Manager**: pnpm

## Running the App

The app uses a custom Node.js server (`server/index.js`) that wraps Next.js and broadcasts live crypto prices via Pusher.

- **Dev**: `pnpm run dev` → starts on port 5000
- **Build**: `pnpm run build`
- **Production**: `pnpm run start` → starts on port 5000

Port 5000 is required for Replit's webview proxy.

## Key Directories

- `app/` — Next.js App Router pages and API routes
- `app/api/` — Server-side API endpoints (auth, deposits, markets, etc.)
- `components/` — Shared React components
- `lib/` — Utilities (auth, db, email, push, env validation)
- `server/` — Custom Node.js server entry point
- `prisma/` — Database schema and seed

## Environment Variables Required

See `.env.example` for full list. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for user JWT tokens (min 16 chars) |
| `ADMIN_JWT_SECRET` | Secret for admin JWT tokens (min 16 chars) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for avatar uploads |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase project config (push notifications) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase service account JSON (server-side FCM) |
| `PUSHER_APP_ID` / `PUSHER_KEY` / `PUSHER_SECRET` / `PUSHER_CLUSTER` | Pusher Channels credentials |

## Key Features

- **Referral System**: Full multi-tier referral program with codes, leaderboard, campaigns. Rewards page at `/rewards`. Wallet tab provides entry point.
- **KYC Workflow**: 4-step stepper (Personal → Document → Selfie → Review). Admin panel approves/rejects and triggers email + reward.
- **Admin Panel**: Full command center at `/admin/` with dashboard KPIs, user management (4-state KYC badges), KYC review, deposits/withdrawals, broadcast, support chat.
- **Landing Page**: Animated CSS phone UI showcase section, referral program section, live price ticker, investment plans, testimonials, FAQ. No video dependency.
- **Bottom Nav**: 5 tabs — Home / Markets / Invest / Wallet / Profile. Rewards accessible via Wallet → Rewards button.
- **Profile/Settings**: KYC badge shows all 4 states: NOT VERIFIED / PENDING / VERIFIED / REJECTED with correct colors and action hints.

## Deployment (Vercel / GitHub)

- `vercel.json` — build command, security headers
- `.env.example` — all required env vars documented, no secrets hardcoded
- `.gitignore` — excludes `/uploads/` (KYC files), `.env`, `.local/`
- Database migrations run via `prisma migrate deploy` before first start
- KYC file uploads use `BLOB_READ_WRITE_TOKEN` (Vercel Blob) in production

## Replit Migration Notes

- Server defaults to port `5000` (set in `server/index.js`) to satisfy Replit's webview requirement
- Host is bound to `0.0.0.0` for Replit's proxy
- pnpm is used as the package manager (detected from `pnpm-lock.yaml`)
