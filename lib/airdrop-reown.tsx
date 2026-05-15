'use client'

import { createAppKit } from '@reown/appkit/react'
import { wagmiAdapter, projectId, networks } from '@/lib/config/reown'

const metadata = {
  name: 'Altaris Airdrop',
  description: 'Altaris airdrop claim wallet connection',
  url: 'https://altaris-capital.vercel.app',
  icons: ['https://altaris-capital.vercel.app/icons/icon-192x192.png'],
}

export const airdropAppkit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  metadata,
  showWallets: true,
  themeMode: 'dark',
  features: { analytics: false, socials: false, email: false },
  themeVariables: {
    '--w3m-accent': '#F2BA0B',
  },
})
