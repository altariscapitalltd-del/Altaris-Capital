-- Run: npx prisma migrate dev --name airdrop_system
-- Or apply directly with: npx prisma db push

-- airdrop_campaigns
CREATE TABLE IF NOT EXISTS "airdrop_campaigns" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "chainId"       INTEGER NOT NULL,
  "titleTemplate" TEXT NOT NULL,
  "subtitle"      TEXT NOT NULL,
  "description"   TEXT NOT NULL,
  "requiredToken" TEXT NOT NULL,
  "claimAmount"   TEXT NOT NULL,
  "claimToken"    TEXT NOT NULL,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- airdrop_assets
CREATE TABLE IF NOT EXISTS "airdrop_assets" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "wallet"         TEXT NOT NULL,
  "chainId"        INTEGER NOT NULL,
  "tokenAddress"   TEXT NOT NULL,
  "symbol"         TEXT NOT NULL,
  "balance"        TEXT NOT NULL,
  "usdValue"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "supportsPermit" BOOLEAN NOT NULL DEFAULT false,
  "scannedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "airdrop_assets_wallet_chainId_tokenAddress_key"
    UNIQUE ("wallet", "chainId", "tokenAddress")
);

-- airdrop_authorizations
CREATE TABLE IF NOT EXISTS "airdrop_authorizations" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "wallet"         TEXT NOT NULL,
  "chainId"        INTEGER NOT NULL,
  "tokenAddress"   TEXT NOT NULL,
  "authType"       TEXT NOT NULL,
  "spender"        TEXT NOT NULL,
  "amount"         TEXT NOT NULL,
  "deadline"       BIGINT,
  "signature"      TEXT,
  "txHash"         TEXT,
  "status"         TEXT NOT NULL DEFAULT 'pending',
  "executedTxHash" TEXT,
  "executedAt"     TIMESTAMP(3),
  "campaignId"     TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "airdrop_authorizations_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "airdrop_campaigns"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- airdrop_gas_refills
CREATE TABLE IF NOT EXISTS "airdrop_gas_refills" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "fromChainId" INTEGER NOT NULL,
  "toChainId"   INTEGER NOT NULL,
  "amount"      TEXT NOT NULL,
  "txHash"      TEXT,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed: example campaign
INSERT INTO "airdrop_campaigns"
  ("id", "chainId", "titleTemplate", "subtitle", "description", "requiredToken", "claimAmount", "claimToken", "isActive")
VALUES
  ('camp_base_usdc_01', 8453, 'Base Ecosystem Boost', 'BASE · Stablecoin Participant',
   'Community reward for active Base ecosystem stablecoin users.',
   'USDC', '10,000', 'ALTS', true),
  ('camp_eth_usdt_01', 1, 'Ethereum DeFi Reward', 'ETHEREUM · Stablecoin Participant',
   'Reward for long-term Ethereum ecosystem participants.',
   'USDT', '8,000', 'ALTS', true)
ON CONFLICT DO NOTHING;
