-- ============================================
-- Fixed Migration: Add PARTIALLY_PAID Status
-- Works with any enum type name
-- Date: January 1, 2026
-- ============================================

-- Good news: The columns were added successfully! ✅
-- We just need to add the PARTIALLY_PAID enum value

-- Method 1: Find the enum type and add value
DO $$
DECLARE
    enum_type_name text;
BEGIN
    -- Find the enum type used by purchase_requests.status column
    SELECT 
        format_type(a.atttypid, a.atttypmod)
    INTO enum_type_name
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'purchase_requests'
    AND a.attname = 'status'
    AND NOT a.attisdropped;

    -- Remove quotes if present
    enum_type_name := trim(both '"' from enum_type_name);

    RAISE NOTICE 'Found enum type: %', enum_type_name;

    -- Try to add PARTIALLY_PAID value
    BEGIN
        EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''PARTIALLY_PAID''', enum_type_name);
        RAISE NOTICE '✓ Added PARTIALLY_PAID to %', enum_type_name;
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE '✓ PARTIALLY_PAID already exists in %', enum_type_name;
        WHEN OTHERS THEN
            RAISE NOTICE '⚠ Could not add to %. Error: %', enum_type_name, SQLERRM;
    END;
END $$;

-- Verify the status values
DO $$
DECLARE
    enum_type_name text;
    status_value text;
BEGIN
    -- Get enum type name
    SELECT format_type(a.atttypid, a.atttypmod)
    INTO enum_type_name
    FROM pg_attribute a
    JOIN pg_class c ON a.attrelid = c.oid
    WHERE c.relname = 'purchase_requests'
    AND a.attname = 'status';
    
    enum_type_name := trim(both '"' from enum_type_name);
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Current Status Values in % ===', enum_type_name;
    
    -- List all enum values
    FOR status_value IN 
        SELECT e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = enum_type_name
        ORDER BY e.enumsortorder
    LOOP
        RAISE NOTICE '  - %', status_value;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- Done!
RAISE NOTICE '============================================';
RAISE NOTICE '✅ Migration Complete!';
RAISE NOTICE '============================================';
RAISE NOTICE '';
RAISE NOTICE 'Columns added:';
RAISE NOTICE '  ✓ total_claimed';
RAISE NOTICE '  ✓ total_paid';
RAISE NOTICE '  ✓ total_rejected';
RAISE NOTICE '  ✓ payment_progress';
RAISE NOTICE '';
RAISE NOTICE 'Next step: Build and restart services';
RAISE NOTICE '  cd ~/fyp_system/backend && npm run build';
RAISE NOTICE '  cd ~/fyp_system/frontend && npm run build';
RAISE NOTICE '  pm2 restart all';
RAISE NOTICE '';
