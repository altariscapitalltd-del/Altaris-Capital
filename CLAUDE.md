# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Altaris Capital is a production-ready fintech investment platform — a Progressive Web App (PWA) built on Next.js 14 with App Router, PostgreSQL via Prisma, and real-time features via Pusher. Users can deposit crypto, purchase investment plans with daily ROI, withdraw funds, complete KYC, and connect Web3 wallets. An admin panel manages users, deposits, withdrawals, and KYC approvals.

## Commands

```bash
# Development (runs custom Node.js server with Pusher broadcasting)
npm run dev

# Build for production
npm run build

# Production server
npm start

# Database
npm run db:push        # push schema changes (no migration history)
npm run db:migrate     # create and apply a named migration
npm run db:generate    # regenerate Prisma client after schema edits
npm run db:seed        # seed admin + demo user (uses SEED_* env vars)
```

There is no test runner or lint script configured. TypeScript type-checking runs as part of `npm run build`.

## Architecture

### Entry Point

`server/index.js` is the actual server — not `next start`. It wraps Next.js in a plain Node.js HTTP server and runs a `setInterval` that fetches live prices from CoinGecko every ~6 seconds and broadcasts them to Pusher channel `public-market`. Both `npm run dev` and `npm start` execute this file.

### Route Groups

| Group | Path prefix | Purpose |
|---|---|---|
| `(website)` | `/` | Public marketing landing page |
| `(auth)` | `/login`, `/signup`, `/forgot-password`, `/reset-password` | Unauthenticated auth flows |
| `(app)` | `/home`, `/wallet`, `/markets`, `/invest`, `/dashboard`, `/profile`, `/settings`, `/kyc`, `/support`, `/transactions`, `/rewards`, `/notifications` | Authenticated user app |
| `admin` | `/admin/*` | Admin panel (separate JWT) |
| `airdrop` | `/airdrop` | Standalone Web3 wallet-connect page |

Route protection is handled inside each route/layout by calling `getAuthUser()` or `getAdminUser()` from `lib/auth.ts` and redirecting to login if null. There is no Next.js middleware file.

### Auth System (`lib/auth.ts`)

Two independent JWT flows with separate secrets and cookies:

- **Users**: cookie `token`, secret `JWT_SECRET`, verified via `getAuthUser()`
- **Admins**: cookie `admin_token`, secret `ADMIN_JWT_SECRET`, verified via `getAdminUser()` (also checks `role IN ['ADMIN', 'SUPER_ADMIN']`)

Tokens are signed with HS256, expire in 7 days. In development, fallback secrets are used if env vars are absent; in production, missing secrets throw.

### Database (`prisma/schema.prisma`)

Key models and relationships:
- **User** → has many **Balance** (one per currency), **Transaction**, **Investment**, **OTP**, **Notification**
- **Balance** → has many **BalanceSnapshot** (point-in-time snapshots for chart history)
- **Transaction** — types: `DEPOSIT | WITHDRAWAL | INVESTMENT | PROFIT | BONUS | ADJUSTMENT | REFERRAL_BONUS`; statuses: `PENDING | SUCCESS | REJECTED | CANCELLED`
- **Investment** — statuses: `ACTIVE | COMPLETED | CANCELLED`; tracks daily ROI accrual
- **KycSubmission** — documents stored in Vercel Blob; status managed by admins
- **OTP** — purposes: `SIGNUP | LOGIN | WITHDRAWAL | KYC`
- **WalletAddress** — admin-configurable deposit addresses per currency (BTC, ETH, USDT)

All IDs are `cuid()`. Cascade deletes propagate from User.

### API Routes (`app/api/`)

All API routes are Next.js Route Handlers. Auth is enforced by calling `getAuthUser(req)` or `getAdminUser(req)` at the top of each handler — there is no shared middleware. Admin routes live under `app/api/admin/`. Input validation uses Zod on financial/admin mutation routes.

### Real-time (`lib/push.ts`, `server/index.js`)

Two Pusher systems in parallel:
1. **Pusher Channels** — server pushes market price ticks from `server/index.js`; client subscribes to `public-market` for live prices, private channels for user notifications and support chat
2. **Pusher Beams** — push notifications to devices (wraps `@pusher/push-notifications-server`)

Firebase FCM is also wired for Web Push fallback via VAPID.

### Web3 / Wallet Connect (`app/airdrop/`)

Uses Reown AppKit (`@reown/appkit`) with the Wagmi adapter. AppKit must be initialised at module load (before any hook executes) — this is a known constraint from a prior build fix. Requires `NEXT_PUBLIC_REOWN_PROJECT_ID`.

### Styling

Tailwind CSS with custom semantic color tokens defined in `tailwind.config.js`: `bg-primary`, `brand`, `success`, `danger`. Dark theme is the default. Mobile-first with iOS PWA safe-area handling (`env(safe-area-inset-*)`) and `100dvh`/`100svh` viewport containers so the fixed header and bottom nav don't overlap content in standalone mode.

## Key Environment Variables

```env
DATABASE_URL=postgresql://...
JWT_SECRET=<64+ char>
ADMIN_JWT_SECRET=<64+ char>
GMAIL_USER / GMAIL_APP_PASSWORD        # email OTP delivery
NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY  # web push
PUSHER_APP_ID / PUSHER_KEY / PUSHER_SECRET / PUSHER_CLUSTER
NEXT_PUBLIC_PUSHER_KEY / NEXT_PUBLIC_PUSHER_CLUSTER
BLOB_READ_WRITE_TOKEN                  # Vercel Blob (KYC/avatar uploads)
NEXT_PUBLIC_APP_URL
PORT / HOST
# Optional
NEXT_PUBLIC_REOWN_PROJECT_ID           # Airdrop wallet connect
FIREBASE_* / NEXT_PUBLIC_FIREBASE_VAPID_KEY  # FCM
TELEGRAM_BOT_TOKEN / TELEGRAM_KYC_CHAT_ID   # admin Telegram alerts
OPENAI_API_KEY                         # AI support chat
SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_DEMO_EMAIL / SEED_DEMO_PASSWORD
```

## Deployment

Target is Vercel. Uses **npm** (not pnpm) for Vercel builds despite `pnpm-lock.yaml` also being present — `package-lock.json` is the canonical lockfile.

- Install: `npm ci --legacy-peer-deps`
- Build: `npm run build`
- Security headers and rewrites are configured in `vercel.json`
