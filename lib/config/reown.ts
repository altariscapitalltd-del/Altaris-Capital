import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, base, polygon } from '@reown/appkit/networks'

const envProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

if (!envProjectId && process.env.NODE_ENV === 'production') {
  // During build, we might not have the project ID, but we need to avoid crashing
  // However, Next.js build often runs in production mode.
  // Let's use a dummy ID if it's missing during build.
}
export const projectId = envProjectId || 'dummy-project-id'
export const networks = [mainnet, arbitrum, base, polygon] as const
export const wagmiAdapter = new WagmiAdapter({ projectId, networks: networks as any })
