import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, FONT_BODY, FONT_DISPLAY } from './theme'
import { useFonts } from './useFonts'

const ACTIONS = ['Deposit', 'Withdraw', 'Invest', 'History']

export const BalanceReveal: React.FC<{ target: number; changePct: number }> = ({ target, changePct }) => {
  useFonts()
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Card lifts in
  const cardIn = spring({ frame, fps, config: { damping: 200, mass: 0.7 } })
  const cardY = interpolate(cardIn, [0, 1], [40, 0])

  // Balance counts up (frames 14 → 74), eased
  const countT = interpolate(frame, [14, 74], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const eased = 1 - Math.pow(1 - countT, 3)
  const value = eased * target
  const [whole, cents] = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).split('.')

  // Eyebrow + hairline + change + actions reveal
  const eyebrowO = interpolate(frame, [6, 20], [0, 1], { extrapolateRight: 'clamp' })
  const hairlineW = interpolate(frame, [58, 92], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const changeO = interpolate(frame, [80, 96], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const changeY = interpolate(frame, [80, 96], [10, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: C.obsidian, fontFamily: FONT_BODY }}>
      {/* gold radial atmosphere */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(60% 40% at 78% 16%, rgba(201,162,39,0.16), transparent 60%), radial-gradient(80% 50% at 50% 120%, rgba(201,162,39,0.05), transparent 60%)',
        }}
      />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 80 }}>
        <div
          style={{
            width: '100%',
            transform: `translateY(${cardY}px)`,
            opacity: cardIn,
            background: 'radial-gradient(140% 120% at 100% 0, rgba(201,162,39,0.10), transparent 55%), linear-gradient(180deg, #101116, #0A0B0E)',
            border: `2px solid ${C.goldSoft}`,
            borderRadius: 44,
            padding: '74px 64px 64px',
            boxShadow: '0 60px 140px rgba(0,0,0,0.6)',
          }}
        >
          {/* eyebrow */}
          <div
            style={{
              opacity: eyebrowO,
              color: C.gold,
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
            }}
          >
            Total Portfolio
          </div>

          {/* balance — Fraunces serif, tabular */}
          <div
            style={{
              marginTop: 26,
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
              fontSize: 168,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: C.bone,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ${whole}
            <span style={{ color: C.mute }}>.{cents}</span>
          </div>

          {/* gold hairline draws in */}
          <div style={{ height: 3, marginTop: 30, borderRadius: 2, transformOrigin: 'left', transform: `scaleX(${hairlineW})`, background: `linear-gradient(90deg, ${C.gold}, rgba(201,162,39,0))` }} />

          {/* change today */}
          <div style={{ marginTop: 34, opacity: changeO, transform: `translateY(${changeY}px)`, display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ color: C.success, fontSize: 38, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              +{changePct.toFixed(1)}% today
            </span>
            <span style={{ color: C.gold, fontSize: 24, fontWeight: 700, letterSpacing: '0.18em' }}>● LIVE</span>
          </div>

          {/* statement actions */}
          <div style={{ display: 'flex', gap: 20, marginTop: 56 }}>
            {ACTIONS.map((a, i) => {
              const start = 96 + i * 7
              const o = interpolate(frame, [start, start + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              const y = interpolate(frame, [start, start + 14], [22, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
              return (
                <div
                  key={a}
                  style={{
                    flex: 1,
                    opacity: o,
                    transform: `translateY(${y}px)`,
                    background: 'rgba(236,231,219,0.03)',
                    border: `1px solid ${C.goldSoft}`,
                    borderRadius: 22,
                    padding: '28px 0',
                    textAlign: 'center',
                    color: C.mute,
                    fontSize: 28,
                    fontWeight: 600,
                  }}
                >
                  {a}
                </div>
              )
            })}
          </div>
        </div>

        {/* wordmark footer */}
        <div style={{ marginTop: 64, display: 'flex', alignItems: 'center', gap: 16, opacity: interpolate(frame, [120, 140], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          <Triangle size={28} />
          <span style={{ color: C.bone, fontWeight: 800, letterSpacing: '0.18em', fontSize: 34 }}>ALTARIS</span>
          <span style={{ color: C.gold, fontWeight: 700, letterSpacing: '0.24em', fontSize: 20, textTransform: 'uppercase' }}>Capital</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

const Triangle: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: 0, height: 0, borderLeft: `${size * 0.62}px solid transparent`, borderRight: `${size * 0.62}px solid transparent`, borderBottom: `${size}px solid ${C.gold}` }} />
)
