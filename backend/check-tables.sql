-- Check all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check if 'user' table exists and has data
SELECT 
    'user' as table_name,
    COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user';

-- Check if 'users' table exists and has data
SELECT 
    'users' as table_name,
    COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'users';

-- View structure of 'user' table (if exists)
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user'
ORDER BY ordinal_position;

-- View structure of 'users' table (if exists)
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Count rows in each table
SELECT 
    (SELECT COUNT(*) FROM "user" WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user')) as user_table_count,
    (SELECT COUNT(*) FROM users WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')) as users_table_count;

