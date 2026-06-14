# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev           # Start custom Node.js server (wraps Next.js) on port 5000 (dev) / 3000 (prod)
npm run build         # Next.js build + copy BUILD_ID for cache busting
npm run start         # Production server

# Database
npm run db:push       # Push schema changes to DB (no migration file)
npm run db:migrate    # Create and apply a migration
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:seed       # Seed demo users and investment plans

# Install
npm ci --legacy-peer-deps   # Required flag — many packages have peer dep conflicts
```

There is no lint or test script configured. ESLint is disabled during builds (`eslint: { ignoreDuringBuilds: true }` in `next.config.js`).

## Architecture

### Route Groups

Next.js App Router with three route groups:

- **`app/(app)/`** — Authenticated user-facing routes (dashboard, wallet, invest, markets, kyc, profile, settings, support, transactions, notifications, rewards). Wrapped in a shared auth-checking layout at `app/(app)/layout.tsx`.
- **`app/(auth)/`** — Public auth pages (login, signup, forgot-password, reset-password).
- **`app/(website)/`** — Marketing landing page (public, no auth).
- **`app/admin/`** — Role-gated admin dashboard (ADMIN / SUPER_ADMIN roles only).
- **`app/airdrop/`** — Standalone Web3 wallet-connect + airdrop claim page.
- **`app/api/`** — REST API handlers. No tRPC or GraphQL.

### Custom Server

The app does **not** run directly via `next start`. `server/index.js` is a Node.js server that:
1. Wraps the Next.js request handler.
2. Runs a 30-second interval to fetch BTC/ETH/BNB/SOL/XRP prices from CoinGecko and broadcast them to the `public-market` Pusher channel.

### Authentication

- JWT stored in an **httpOnly cookie** named `token` (users) or `admin_token` (admins).
- `lib/auth.ts` exports `getAuthUser(request)` and `getAdminUser(request)` — call these at the top of every protected API route.
- Separate `JWT_SECRET` and `ADMIN_JWT_SECRET` environment variables.
- Token lifetime: 7 days.
- OTP system (`lib/otp.ts`) used for signup confirmation, withdrawal confirmation, and KYC.

### Database

Prisma ORM with PostgreSQL. Schema lives in `prisma/schema.prisma`.

Key models: `User`, `Balance` (per-currency wallet balance, unique on userId+currency), `Transaction` (all money movements), `Investment`, `KycSubmission`, `OTP`, `Notification`, `Conversation`/`Message` (support chat), `WalletAddress` (deposit addresses), `AdminAuditLog`, `Referral`/`ReferralReward`, `Campaign`.

After any schema change run `npm run db:generate` to regenerate the Prisma client. Use `npm run db:push` for dev iteration; `npm run db:migrate` when you need a tracked migration.

### Real-time (Pusher)

- **`public-market`** channel — crypto price ticks, broadcast by `server/index.js`.
- **`private-user-{userId}`** channels — chat messages and notifications, authenticated via `app/api/pusher/auth/route.ts`.
- Client uses `pusher-js`; server uses `pusher` npm package (both in `lib/pusher.ts`).

### File Uploads

All uploads go to **Vercel Blob** (`@vercel/blob`):
- KYC documents → `app/api/kyc/upload/route.ts`
- User avatars → `app/api/user/avatar/blob/route.ts`

### Web3 / Wallet

The airdrop page (`app/airdrop/`) uses **Reown AppKit** (formerly WalletConnect AppKit) configured in `lib/config/reown.ts`. Supported wallets: MetaMask, Coinbase Wallet, WalletConnect, Safe Apps. Requires `NEXT_PUBLIC_REOWN_PROJECT_ID`.

### Styling

Tailwind CSS utility-first. Dark mode via `darkMode: 'class'` — the `<html>` element gets `data-theme="dark"` or `"light"`.

Custom CSS variables defined in `app/globals.css` (brand colors, layout heights, semantic tokens). Reusable utility classes (`.btn-primary`, `.btn-ghost`, `.card`, `.chip`, `.badge`) are defined there too — prefer these over inline Tailwind for interactive elements.

Brand palette:
- Gold (primary): `#F0B90B`
- Blue (secondary): `#1E80FF`
- Success: `#0ECB81`
- Danger: `#F6465D`
- Dark bg scale: `#0B0E11` → `#151A21` → `#1E2329` → `#2B3139`

Layout constants (CSS vars): `--app-header-height: 120px`, `--app-bottom-nav-height: 84px`.

### Notifications

Two parallel push systems:
1. **Web Push (VAPID)** — `lib/push.ts`, subscription saved in `User.pushSubscription`, sent via `web-push` library.
2. **Firebase Cloud Messaging** — `lib/firebaseClient.ts` + `public/firebase-messaging-sw.js`.

Admin alerts for KYC events go through Telegram (`lib/telegramBot.ts`, `lib/admin-notify.ts`).

## Environment Variables

See `.env.example` for the full list. Minimum required to run locally:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | User JWT signing (falls back to insecure default in dev) |
| `ADMIN_JWT_SECRET` | Admin JWT signing |
| `NEXT_PUBLIC_APP_URL` | Used in emails and referral links |
| `GMAIL_USER` + `GMAIL_APP_PASSWORD` | Transactional email via Nodemailer |
| `PUSHER_APP_ID/KEY/SECRET/CLUSTER` + `NEXT_PUBLIC_PUSHER_KEY` | Real-time |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` | Web Push |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (KYC docs, avatars) |
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | Airdrop wallet connect |

## Path Alias

`@/` maps to the repository root (e.g., `@/lib/auth`, `@/components/ui/CoinIcon`).
