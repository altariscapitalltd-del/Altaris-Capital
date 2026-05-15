import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, base, polygon } from '@reown/appkit/networks'

const envProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

if (!envProjectId) {
  throw new Error('Missing NEXT_PUBLIC_REOWN_PROJECT_ID environment variable')
}

export const projectId = envProjectId
export const networks = [mainnet, arbitrum, base, polygon] as const
export const wagmiAdapter = new WagmiAdapter({ projectId, networks: networks as any })
