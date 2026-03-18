import { PrismaClient } from '@prisma/client'

const HOTFIX_SQL = `
DO $$ BEGIN
  CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REJECTED_SELF', 'REJECTED_DUPLICATE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "RewardEventType" AS ENUM ('REFERRAL_BONUS', 'REFERRAL_TIER', 'REFERRAL_COMMISSION', 'CAMPAIGN_BONUS', 'VIP_UNLOCK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "referredById" TEXT;
ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "rewardBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "rewardEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "users"
SET "referralCode" = CONCAT('ALT', UPPER(SUBSTRING(REGEXP_REPLACE("id", '[^a-zA-Z0-9]', '', 'g') FROM GREATEST(LENGTH(REGEXP_REPLACE("id", '[^a-zA-Z0-9]', '', 'g')) - 8, 1) FOR 9)))
WHERE "referralCode" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key" ON "users"("referralCode");
CREATE INDEX IF NOT EXISTS "users_referredById_idx" ON "users"("referredById");

ALTER TABLE IF EXISTS "kyc_submissions" ADD COLUMN IF NOT EXISTS "documentType" TEXT;
ALTER TABLE IF EXISTS "kyc_submissions" ADD COLUMN IF NOT EXISTS "documentNumber" TEXT;
ALTER TABLE IF EXISTS "kyc_submissions" ADD COLUMN IF NOT EXISTS "selfiePath" TEXT;
ALTER TABLE IF EXISTS "kyc_submissions" ADD COLUMN IF NOT EXISTS "telegramDeliveryState" TEXT;

CREATE TABLE IF NOT EXISTS "referrals" (
  "id" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "referredUserId" TEXT NOT NULL,
  "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
  "emailVerifiedAt" TIMESTAMP(3),
  "kycVerifiedAt" TIMESTAMP(3),
  "depositQualifiedAt" TIMESTAMP(3),
  "qualifiedAt" TIMESTAMP(3),
  "qualificationDeposit" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referredUserId_key" ON "referrals"("referredUserId");
CREATE INDEX IF NOT EXISTS "referrals_referrerId_status_idx" ON "referrals"("referrerId", "status");

CREATE TABLE IF NOT EXISTS "reward_events" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "RewardEventType" NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reward_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "reward_events_userId_type_idx" ON "reward_events"("userId", "type");

CREATE TABLE IF NOT EXISTS "referral_campaigns" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "targetReferrals" INTEGER NOT NULL,
  "rewardAmount" DOUBLE PRECISION NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "referral_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "campaign_rewards" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "qualifiedReferrals" INTEGER NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "campaign_rewards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_rewards_campaignId_userId_key" ON "campaign_rewards"("campaignId", "userId");

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "reward_events" ADD CONSTRAINT "reward_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "campaign_rewards" ADD CONSTRAINT "campaign_rewards_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "referral_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "campaign_rewards" ADD CONSTRAINT "campaign_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`

let bootstrapPromise: Promise<void> | null = null

export async function ensureDatabaseCompatibility(rawPrisma: PrismaClient) {
  if (process.env.DB_COMPAT_BOOTSTRAP_DISABLED === '1') return
  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = (async () => {
    try {
      await rawPrisma.$executeRawUnsafe(HOTFIX_SQL)
    } catch (error: any) {
      const message = String(error?.message || '')
      if (message.includes('does not exist') || message.includes('relation') || message.includes('schema')) {
        console.warn('[db-bootstrap] skipped compatibility hotfix:', message)
        return
      }
      throw error
    }
  })()

  return bootstrapPromise
}

export { HOTFIX_SQL }
