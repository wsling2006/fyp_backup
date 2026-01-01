-- ============================================
-- Migration: Add PARTIALLY_PAID Status and Financial Tracking
-- Date: January 1, 2026
-- Description: Adds new status and columns for tracking payment progress
-- ============================================

-- Step 1: Add new PARTIALLY_PAID status to enum
-- Note: PostgreSQL doesn't support "IF NOT EXISTS" for enum values before v12
-- This will error if value already exists, which is safe to ignore
ALTER TYPE "purchase_request_status_enum" ADD VALUE 'PARTIALLY_PAID';

-- Step 2: Add financial tracking columns
ALTER TABLE "purchase_requests" 
ADD COLUMN IF NOT EXISTS "total_claimed" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "total_paid" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "total_rejected" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "payment_progress" INTEGER DEFAULT 0;

-- Step 3: Initialize NULL values to 0 for existing records
UPDATE "purchase_requests" 
SET 
  total_claimed = COALESCE(total_claimed, 0),
  total_paid = COALESCE(total_paid, 0),
  total_rejected = COALESCE(total_rejected, 0),
  payment_progress = COALESCE(payment_progress, 0)
WHERE total_claimed IS NULL 
   OR total_paid IS NULL 
   OR total_rejected IS NULL 
   OR payment_progress IS NULL;

-- Step 4: Optional - Backfill existing data (if you have existing PAID requests)
-- This will recalculate financial tracking for existing requests with claims
-- Uncomment if needed:

/*
UPDATE purchase_requests pr
SET 
  total_claimed = (
    SELECT COALESCE(SUM(c.amount_claimed), 0)
    FROM claims c
    WHERE c.purchase_request_id = pr.id
  ),
  total_paid = (
    SELECT COALESCE(SUM(c.amount_claimed), 0)
    FROM claims c
    WHERE c.purchase_request_id = pr.id 
    AND c.status = 'PROCESSED'
  ),
  total_rejected = (
    SELECT COALESCE(SUM(c.amount_claimed), 0)
    FROM claims c
    WHERE c.purchase_request_id = pr.id 
    AND c.status = 'REJECTED'
  ),
  payment_progress = CASE 
    WHEN pr.approved_amount > 0 THEN 
      ROUND((
        (SELECT COALESCE(SUM(c.amount_claimed), 0)
         FROM claims c
         WHERE c.purchase_request_id = pr.id 
         AND c.status = 'PROCESSED') 
        / pr.approved_amount
      ) * 100)
    ELSE 0
  END
WHERE pr.status IN ('APPROVED', 'PAID');
*/

-- Step 5: Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'purchase_requests'
AND column_name IN ('total_claimed', 'total_paid', 'total_rejected', 'payment_progress');

-- Step 6: Verify enum values
SELECT unnest(enum_range(NULL::purchase_request_status_enum)) AS status_values;

-- Done!
-- ============================================
