import React from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, FONT_BODY, FONT_DISPLAY } from './theme'
import { useFonts } from './useFonts'

export const BrandSting: React.FC = () => {
  useFonts()
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const markIn = spring({ frame, fps, config: { damping: 14, mass: 0.8 } })
  const markScale = interpolate(markIn, [0, 1], [0.4, 1])
  const wordO = interpolate(frame, [16, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const wordX = interpolate(frame, [16, 34], [-30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const ruleW = interpolate(frame, [38, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const tagO = interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const tagY = interpolate(frame, [60, 80], [16, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const outO = interpolate(frame, [104, 120], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: C.obsidian, fontFamily: FONT_BODY, opacity: outO }}>
      <AbsoluteFill style={{ background: 'radial-gradient(50% 60% at 50% 42%, rgba(201,162,39,0.12), transparent 60%)' }} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ transform: `scale(${markScale})`, width: 0, height: 0, borderLeft: '40px solid transparent', borderRight: '40px solid transparent', borderBottom: `70px solid ${C.gold}`, filter: 'drop-shadow(0 8px 30px rgba(201,162,39,0.4))' }} />
          <div style={{ opacity: wordO, transform: `translateX(${wordX}px)`, display: 'flex', alignItems: 'baseline', gap: 18 }}>
            <span style={{ color: C.bone, fontWeight: 800, letterSpacing: '0.2em', fontSize: 92 }}>ALTARIS</span>
            <span style={{ color: C.gold, fontWeight: 700, letterSpacing: '0.32em', fontSize: 40, textTransform: 'uppercase' }}>Capital</span>
          </div>
        </div>

        <div style={{ height: 2, width: 560, marginTop: 46, transformOrigin: 'center', transform: `scaleX(${ruleW})`, background: `linear-gradient(90deg, rgba(201,162,39,0), ${C.gold}, rgba(201,162,39,0))` }} />

        <div style={{ marginTop: 40, opacity: tagO, transform: `translateY(${tagY}px)`, fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: 500, fontSize: 46, color: C.goldBright }}>
          A considered home for serious capital.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
