-- ============================================
-- Complete Migration: Create Enum and Add Columns
-- Date: January 1, 2026
-- Works when enum doesn't exist yet
-- ============================================

-- Step 1: Check if enum exists, if not create it
DO $$ 
BEGIN
    -- Try to create the enum type
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_request_status_enum') THEN
        CREATE TYPE purchase_request_status_enum AS ENUM (
            'DRAFT',
            'SUBMITTED', 
            'UNDER_REVIEW',
            'APPROVED',
            'REJECTED',
            'PARTIALLY_PAID',
            'PAID'
        );
        RAISE NOTICE '✓ Created purchase_request_status_enum with PARTIALLY_PAID';
    ELSE
        -- Enum exists, try to add PARTIALLY_PAID
        BEGIN
            ALTER TYPE purchase_request_status_enum ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
            RAISE NOTICE '✓ Added PARTIALLY_PAID to existing enum';
        EXCEPTION 
            WHEN duplicate_object THEN
                RAISE NOTICE '✓ PARTIALLY_PAID already exists';
        END;
    END IF;
END $$;

-- Step 2: Ensure status column uses the enum (if it doesn't already)
DO $$
BEGIN
    -- Check if status column exists and its type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_requests' 
        AND column_name = 'status'
        AND data_type = 'character varying'
    ) THEN
        -- Column exists but is VARCHAR, convert to enum
        RAISE NOTICE 'Converting status column to enum type...';
        ALTER TABLE purchase_requests 
            ALTER COLUMN status TYPE purchase_request_status_enum 
            USING status::purchase_request_status_enum;
        RAISE NOTICE '✓ Converted status column to enum';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_requests' 
        AND column_name = 'status'
    ) THEN
        -- Column doesn't exist, create it
        ALTER TABLE purchase_requests 
            ADD COLUMN status purchase_request_status_enum DEFAULT 'DRAFT';
        RAISE NOTICE '✓ Created status column with enum type';
    ELSE
        RAISE NOTICE '✓ Status column already uses enum type';
    END IF;
END $$;

-- Step 3: Add financial tracking columns (already done, but verify)
ALTER TABLE purchase_requests 
ADD COLUMN IF NOT EXISTS total_claimed DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_paid DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_rejected DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_progress INTEGER DEFAULT 0;

-- Step 4: Initialize NULL values
UPDATE purchase_requests 
SET 
  total_claimed = COALESCE(total_claimed, 0),
  total_paid = COALESCE(total_paid, 0),
  total_rejected = COALESCE(total_rejected, 0),
  payment_progress = COALESCE(payment_progress, 0)
WHERE total_claimed IS NULL 
   OR total_paid IS NULL 
   OR total_rejected IS NULL 
   OR payment_progress IS NULL;

-- Step 5: Verify everything
\echo ''
\echo '============================================'
\echo 'Migration Results:'
\echo '============================================'

-- Show enum values
\echo ''
\echo 'Status Enum Values:'
SELECT enumlabel as status 
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'purchase_request_status_enum'
ORDER BY e.enumsortorder;

-- Show columns
\echo ''
\echo 'Financial Tracking Columns:'
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'purchase_requests'
AND column_name IN ('status', 'total_claimed', 'total_paid', 'total_rejected', 'payment_progress')
ORDER BY ordinal_position;

\echo ''
\echo '============================================'
\echo '✅ Migration Complete!'
\echo '============================================'
\echo 'Next steps:'
\echo '  cd ~/fyp_system/backend && npm run build'
\echo '  cd ~/fyp_system/frontend && npm run build'
\echo '  pm2 restart all'
\echo ''
