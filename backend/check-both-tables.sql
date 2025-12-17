-- Compare data in both tables

-- Check what's in "user" table (singular)
SELECT 
    'user (singular)' as table_name,
    id,
    email,
    role,
    created_at
FROM "user"
ORDER BY created_at DESC;

-- Check what's in "users" table (plural)
SELECT 
    'users (plural)' as table_name,
    id,
    email,
    role,
    created_at
FROM users
ORDER BY created_at DESC;

-- Count rows in each
SELECT 
    'user (singular)' as table_name,
    COUNT(*) as total_rows
FROM "user"
UNION ALL
SELECT 
    'users (plural)' as table_name,
    COUNT(*) as total_rows
FROM users;

