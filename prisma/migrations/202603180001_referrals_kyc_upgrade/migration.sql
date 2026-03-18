-- User reward and referral fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rewardBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredById" TEXT;

UPDATE "users"
SET "referralCode" = UPPER(SUBSTRING(REGEXP_REPLACE(COALESCE(name, ''), '[^A-Za-z0-9]', '', 'g') || SUBSTRING(id, GREATEST(LENGTH(id) - 3, 1), 4) FROM 1 FOR 10))
WHERE "referralCode" IS NULL;

ALTER TABLE "users" ALTER COLUMN "referralCode" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key" ON "users"("referralCode");
ALTER TABLE "users" ADD CONSTRAINT "users_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- KYC enhancements
ALTER TABLE "kyc_submissions" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "kyc_submissions" ADD COLUMN IF NOT EXISTS "documentType" TEXT;
ALTER TABLE "kyc_submissions" ADD COLUMN IF NOT EXISTS "documentNumber" TEXT;
ALTER TABLE "kyc_submissions" ADD COLUMN IF NOT EXISTS "selfiePath" TEXT;

-- Referral tables
CREATE TABLE IF NOT EXISTS "referrals" (
  "id" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "referredUserId" TEXT NOT NULL,
  "referralCode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "identityVerified" BOOLEAN NOT NULL DEFAULT false,
  "minimumDepositMet" BOOLEAN NOT NULL DEFAULT false,
  "qualifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referredUserId_key" ON "referrals"("referredUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referrerId_referredUserId_key" ON "referrals"("referrerId", "referredUserId");
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "referral_campaigns" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "requiredReferrals" INTEGER NOT NULL,
  "rewardAmount" DOUBLE PRECISION NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referral_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reward_ledger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "referralId" TEXT,
  "campaignId" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'CREDITED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reward_ledger_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "reward_ledger" ADD CONSTRAINT "reward_ledger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reward_ledger" ADD CONSTRAINT "reward_ledger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "referral_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
