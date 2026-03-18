-- KYC and referral/rewards upgrade
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "referralCode" TEXT,
  ADD COLUMN IF NOT EXISTS "referredById" TEXT,
  ADD COLUMN IF NOT EXISTS "rewardBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "vipInvestor" BOOLEAN NOT NULL DEFAULT false;

UPDATE "users" SET "referralCode" = UPPER(CONCAT('ALT', RIGHT(REPLACE(id, '-', ''), 8))) WHERE "referralCode" IS NULL;
ALTER TABLE "users" ALTER COLUMN "referralCode" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key" ON "users"("referralCode");
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "kyc_submissions"
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "documentType" TEXT,
  ADD COLUMN IF NOT EXISTS "documentNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "selfiePath" TEXT,
  ADD COLUMN IF NOT EXISTS "telegramDeliveredAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "referrals" (
  "id" TEXT PRIMARY KEY,
  "referrerId" TEXT NOT NULL,
  "referredUserId" TEXT NOT NULL,
  "referralCode" TEXT NOT NULL,
  "signupCompleted" BOOLEAN NOT NULL DEFAULT true,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "identityVerified" BOOLEAN NOT NULL DEFAULT false,
  "minimumDepositMet" BOOLEAN NOT NULL DEFAULT false,
  "qualifiedAt" TIMESTAMP(3),
  "lastQualifiedDeposit" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referredUserId_key" ON "referrals"("referredUserId");
CREATE INDEX IF NOT EXISTS "referrals_referrerId_createdAt_idx" ON "referrals"("referrerId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "referral_rewards" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "referralId" TEXT,
  "kind" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "level" INTEGER,
  "campaignId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "referral_rewards_userId_createdAt_idx" ON "referral_rewards"("userId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "referral_campaigns" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "targetQualified" INTEGER NOT NULL,
  "rewardAmount" DOUBLE PRECISION NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "referral_campaign_claims" (
  "id" TEXT PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rewardId" TEXT,
  "qualifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "referral_campaign_claims_campaignId_userId_key" ON "referral_campaign_claims"("campaignId", "userId");
DO $$ BEGIN
  ALTER TABLE "referral_campaign_claims" ADD CONSTRAINT "referral_campaign_claims_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "referral_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "referral_campaign_claims" ADD CONSTRAINT "referral_campaign_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
