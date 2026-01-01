-- ============================================
-- Quick Fix: Find and Add PARTIALLY_PAID Status
-- Date: January 1, 2026
-- ============================================

-- First, let's find the actual enum type name
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE t.typname LIKE '%status%'
ORDER BY t.typname, e.enumsortorder;

-- This will show you the actual enum type name
-- Common names: purchase_request_status_enum, status_enum, purchaserequeststatus_enum
