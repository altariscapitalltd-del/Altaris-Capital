# Altaris Capital — Brand Motion (Remotion)

Sharp brand videos in the **Private Bank — Obsidian & Gold** language, matched to
the app UI (same palette, Fraunces + Schibsted Grotesk, gold hairlines).

Isolated from the Next app — its own `package.json`, so it never touches the
Vercel deploy.

## Compositions
- **BrandSting** (1920×1080, 4s) — gold mark + ALTARIS·Capital wordmark + gold
  hairline + Fraunces italic tagline. Logo reveal / intro-outro.
- **BalanceReveal** (1080×1920, 5.5s) — the home "statement" hero in motion:
  `TOTAL PORTFOLIO` eyebrow, a Fraunces tabular balance counting up, gold hairline
  draw-in, `+4.2% today · LIVE`, and the Deposit/Withdraw/Invest/History chips.
  Vertical, for social / app onboarding.

## Run
```bash
cd remotion
npm install
npm run studio        # live preview at localhost:3000
npm run render:all    # → out/brand-sting.mp4 + out/balance-reveal.mp4
```
Renders need a headless Chromium; this repo renders with `--gl=angle`.

## Extend
Add a composition in `src/`, register it in `src/Root.tsx`. Palette + fonts live
in `src/theme.ts` (kept in sync with the app's design tokens).
