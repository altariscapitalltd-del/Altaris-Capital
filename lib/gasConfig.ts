export const GAS_CONFIG = {
  // Minimum native balance before triggering auto-refill (0.002 ETH/BNB/MATIC)
  minBalance: BigInt('2000000000000000'),
  // Amount to bridge per refill (0.01 ETH)
  refillAmount: BigInt('10000000000000000'),
  // Minimum relayer balance required to execute a claim (0.001 ETH)
  claimGasThreshold: BigInt('1000000000000000'),
  sourceChainId: 8453, // Base
}

export const SOURCE_CHAIN_ID = GAS_CONFIG.sourceChainId
