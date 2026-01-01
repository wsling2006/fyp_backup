-- ============================================
-- Simple Migration: Manual Enum Discovery
-- Date: January 1, 2026
-- ============================================

-- Step 1: Find your enum type name
SELECT 
    pg_type.typname as enum_type_name,
    pg_enum.enumlabel as status_value
FROM pg_type 
JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid  
JOIN pg_attribute ON pg_attribute.atttypid = pg_type.oid
JOIN pg_class ON pg_attribute.attrelid = pg_class.oid
WHERE pg_class.relname = 'purchase_requests'
AND pg_attribute.attname = 'status'
ORDER BY pg_enum.enumsortorder;

-- Look at the output above and find the enum_type_name
-- Common examples:
--   - purchaserequeststatus_enum
--   - status_enum  
--   - PurchaseRequestStatus

-- Step 2: Once you know the name, uncomment and run ONE of these:

-- If enum name is: purchaserequeststatus_enum
-- ALTER TYPE purchaserequeststatus_enum ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';

-- If enum name is: status_enum
-- ALTER TYPE status_enum ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';

-- If enum name is: PurchaseRequestStatus (with capital letters)
-- ALTER TYPE "PurchaseRequestStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';

-- Step 3: Verify it was added
SELECT 
    pg_enum.enumlabel as status_value
FROM pg_type 
JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid  
JOIN pg_attribute ON pg_attribute.atttypid = pg_type.oid
JOIN pg_class ON pg_attribute.attrelid = pg_class.oid
WHERE pg_class.relname = 'purchase_requests'
AND pg_attribute.attname = 'status'
ORDER BY pg_enum.enumsortorder;

-- You should see PARTIALLY_PAID in the list now!
