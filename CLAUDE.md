# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Operating Standards

Operate like a senior engineer at Bybit or Binance — a professional trading platform. This is a financial product: correctness, security, and visual discipline are non-negotiable.

### Workflow

- Before changing anything: state the plan in 3 lines max, then execute.
- After changes: run lint and type-check (`npx tsc --noEmit`), then give a short diff summary — nothing else.
- Small commits with clear messages. Never break the main branch.

### Product Quality

- The app must feel premium: fast, smooth, zero jank. Every screen needs designed loading, empty, and error states — never a blank screen or raw error text.
- One design system: colors, spacing, and typography come from CSS custom properties in `globals.css`. No one-off hex values except the canonical palette below.
- Mobile-first, responsive, accessible: WCAG-AA contrast, ≥44px touch targets, labelled inputs, focus states.

### Design System — Exchange-Grade UI (Bybit / Binance standard)

**Reference aesthetic:** Bybit, Binance — professional trading platform, NOT consumer fintech or generic SaaS. Dense data, neutral chrome, color used only to convey financial meaning.

**Canonical palette (only these values, ever):**
- Page bg: `#0B0E11`
- Section/card bg: `#161A1F`
- Elevated bg: `#1E2329`
- Border: `rgba(255,255,255,0.06)` — dividers; `rgba(255,255,255,0.10)` — focus/hover
- Text primary: `#EAECEF`
- Text secondary: `#848E9C`
- Text muted: `#474D57`
- Brand / primary CTA only: `#F2BA0E`
- Gain / positive: `#0ECB81`
- Loss / negative: `#F6465D`
- USDC blue: `#2775CA`

**Border-radius rules:**
- Page-level section cards: `12px`
- Rows, chips, badges: `8px`
- Input fields: `8px`
- Buttons: `8px` (pill: `999px` only for status badges)
- NEVER use `> 16px` on any card or container

**Color discipline — the #1 rule:**
- `#F2BA0E` appears ONLY on the single primary CTA per screen, active tab/range indicators, and brand marks. Nowhere else.
- `#0ECB81` / `#F6465D` appear ONLY on numerical gain/loss values, status indicators, and deposit/withdrawal direction icons. NEVER as a button color, card tint, or background gradient.
- `#848E9C` for ALL secondary labels, captions, and metadata. Not custom muted tones per element.
- No per-element accent theming (e.g. green Deposit button, red Withdraw button, purple Rewards — pick neutral grey for all three and use icons to distinguish).

**Typography rules:**
- Labels / captions: `11–12px`, weight `500`, color `#848E9C`
- Row values / data: `13–15px`, weight `600`, color `#EAECEF`
- Section balances: `28–40px`, weight `600` (NOT 800–900 — heavy weights look amateur), `#EAECEF`
- `fontVariantNumeric: 'tabular-nums'` on every monetary value
- Letter-spacing ONLY on uppercase labels (`0.06em`); never on large display numbers

**Card / section rules:**
- Backgrounds are FLAT: `#161A1F`. No `linear-gradient` on card backgrounds.
- No `radial-gradient` glow blobs, no `box-shadow` glow effects, no animated shimmer on loaded content.
- Borders are 1px `rgba(255,255,255,0.06)` — use only to separate sections. Do not add borders as decoration.
- Icon backgrounds: `rgba(color,0.12)` tint, `8px` radius. No rings, no halos, no multiple border layers.

**Spacing rules:**
- Horizontal gutter: `20px` from screen edge
- Section gap: `8px` between sections
- Row internal padding: `14px 18px`
- Do NOT use `gap: 14` or `margin: 16` everywhere — be intentional

**What to NEVER do:**
- `linear-gradient(135deg, #1A1500, #0D0D0D)` or any decorative gradient card background
- Colored tinted backgrounds on action buttons (e.g. `rgba(14,203,129,0.12)` as a button background)
- Different accent colors per action in the same row (multi-color icon button rows)
- `font-weight: 800` or `900` on large display text
- Emojis in UI unless in the referral/gamification section only
- `border-radius: 18px`, `20px`, `22px`, `24px` on anything
- `box-shadow` for decoration (only use for overlay elevation: `0 8px 32px rgba(0,0,0,0.6)`)

### Architecture

- Clean separation: UI (components/pages) / business logic (`lib/`) / data layer (Prisma). No god files, no duplication.
- All environment values are read through `lib/config.ts` — never read `process.env` directly elsewhere. Secrets only from env vars, never committed.
- Every external call (CoinGecko, Pusher, email, Blob) has a timeout, bounded retry where idempotent, and explicit error handling. Never fail silently; never leak internal errors to clients.

### Code Quality

- TypeScript strict mode; no `any` unless interfacing with untyped third-party code (and then isolated at the boundary).
- Small pure functions. Delete dead code on sight.
- Zod validation on every API route body/query the user can influence. Validate file uploads (type, extension, size).

### Security

- Sensitive data (passwords, tokens, OTPs, secrets) must never appear in logs, error responses, or client storage (`localStorage`/`sessionStorage`).
- Auth cookies: `httpOnly`, `secure` in production, `sameSite=lax` minimum.
- OTPs and tokens generated with `crypto`, never `Math.random()`.
- Financial mutations (deposits, withdrawals, balance changes) must be idempotent and audit-logged.

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
