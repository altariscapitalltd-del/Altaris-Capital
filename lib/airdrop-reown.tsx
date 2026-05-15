'use client'

import { createAppKit } from '@reown/appkit/react'
import { wagmiAdapter, projectId, networks } from '@/lib/config/reown'

const metadata = {
  name: 'Altaris Airdrop',
  description: 'Altaris airdrop claim wallet connection',
  url: 'https://altaris-capital.vercel.app',
  icons: ['https://altaris-capital.vercel.app/icons/icon-192x192.png'],
}

let initialized = false

export const ensureAirdropAppkit = () => {
  if (initialized) return
  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: networks as any,
    metadata,
    features: { analytics: false, socials: false, email: false },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#F2BA0B',
    },
  })
  initialized = true
}
