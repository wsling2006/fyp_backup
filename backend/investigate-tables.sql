-- Step 1: Check which tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user', 'users')
ORDER BY table_name;

-- Step 2: Check data in 'user' table (if it exists)
-- Uncomment the line below if 'user' table exists:
-- SELECT id, email, role, created_at FROM "user" ORDER BY created_at DESC;

-- Step 3: Check data in 'users' table (if it exists)
-- This is the table your code should be using
SELECT id, email, role, created_at FROM users ORDER BY created_at DESC;

-- Step 4: Check column structure of 'users' table
SELECT 
    column_name, 
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

