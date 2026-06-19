import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, base, polygon } from '@reown/appkit/networks'

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? ''
export const networks = [mainnet, arbitrum, base, polygon] as const
export const wagmiAdapter = projectId
  ? new WagmiAdapter({ projectId, networks: networks as any })
  : null
