import React from 'react'
import { Composition } from 'remotion'
import { BalanceReveal } from './BalanceReveal'
import { BrandSting } from './BrandSting'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Vertical hero for social / app onboarding — the statement balance in motion */}
      <Composition
        id="BalanceReveal"
        component={BalanceReveal}
        durationInFrames={165}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ target: 128440.2, changePct: 4.2 }}
      />
      {/* Landscape brand sting — logo + wordmark + tagline */}
      <Composition
        id="BrandSting"
        component={BrandSting}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  )
}
