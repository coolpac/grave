-- Add new targeting fields to newsletters
ALTER TABLE "newsletters"
  ADD COLUMN "targetSegment" TEXT,
  ADD COLUMN "recipientIds" JSONB;

-- Track when cart became abandoned
ALTER TABLE "abandoned_carts"
  ADD COLUMN "abandonedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Extended settings for reminder scheduling
ALTER TABLE "abandoned_cart_settings"
  ADD COLUMN "initialDelayHours" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "reminderIntervals" JSONB NOT NULL DEFAULT '[2,24,72]'::jsonb;

