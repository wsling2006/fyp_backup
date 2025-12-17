-- Step 1: Check what's in the "user" table (if it exists)
-- Run this first to see if there's any data
SELECT 
    'user' as table_name,
    COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user';

-- Step 2: View data in "user" table (if it has data)
-- Uncomment below if you want to see what's in it:
-- SELECT * FROM "user";

-- Step 3: Verify your actual data is in "users" table (plural)
-- This confirms your active data is safe
SELECT 
    id,
    email,
    role,
    created_at
FROM users
ORDER BY created_at DESC;

-- Step 4: Once you've verified:
-- a) Your data is in "users" table ✓
-- b) "user" table is empty or has old/unwanted data ✓
-- Then you can safely drop it:

-- OPTION A: Drop if it exists (safe command)
-- DROP TABLE IF EXISTS "user";

-- OPTION B: Drop with CASCADE (removes dependencies too, be careful)
-- DROP TABLE IF EXISTS "user" CASCADE;

