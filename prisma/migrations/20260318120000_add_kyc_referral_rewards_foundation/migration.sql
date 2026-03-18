-- Additive, safe migration for KYC/referral/rewards foundation.

ALTER TYPE "KycStatus" ADD VALUE IF NOT EXISTS 'NOT_VERIFIED';
ALTER TYPE "KycStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "KycStatus" ADD VALUE IF NOT EXISTS 'VERIFIED';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "referralCode" TEXT,
  ADD COLUMN IF NOT EXISTS "referredById" TEXT,
  ADD COLUMN IF NOT EXISTS "rewardBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "kyc_submissions"
  ADD COLUMN IF NOT EXISTS "documentUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "selfieUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "referrals" (
  "id" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "referredId" TEXT NOT NULL,
  "qualified" BOOLEAN NOT NULL DEFAULT false,
  "depositCompleted" BOOLEAN NOT NULL DEFAULT false,
  "kycCompleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rewards" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key" ON "users"("referralCode");
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referrerId_referredId_key" ON "referrals"("referrerId", "referredId");
CREATE INDEX IF NOT EXISTS "rewards_userId_idx" ON "rewards"("userId");
CREATE INDEX IF NOT EXISTS "users_referredById_idx" ON "users"("referredById");
CREATE INDEX IF NOT EXISTS "referrals_referrerId_idx" ON "referrals"("referrerId");
CREATE INDEX IF NOT EXISTS "referrals_referredId_idx" ON "referrals"("referredId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_referredById_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_referredById_fkey"
      FOREIGN KEY ("referredById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referrals_referrerId_fkey'
  ) THEN
    ALTER TABLE "referrals"
      ADD CONSTRAINT "referrals_referrerId_fkey"
      FOREIGN KEY ("referrerId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referrals_referredId_fkey'
  ) THEN
    ALTER TABLE "referrals"
      ADD CONSTRAINT "referrals_referredId_fkey"
      FOREIGN KEY ("referredId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rewards_userId_fkey'
  ) THEN
    ALTER TABLE "rewards"
      ADD CONSTRAINT "rewards_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
