import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, arbitrum, base, polygon } from '@reown/appkit/networks'

export const projectId = '213bfbe5a891eb2fa1fb721f7907ab8a'
export const networks = [mainnet, arbitrum, base, polygon] as any
export const wagmiAdapter = new WagmiAdapter({ projectId, networks: networks as any })
