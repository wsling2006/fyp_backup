-- View all users with key information
SELECT 
    id,
    email,
    role,
    is_active,
    created_at,
    updated_at
FROM users
ORDER BY created_at DESC;

-- View all columns (including sensitive fields - be careful!)
-- SELECT * FROM users ORDER BY created_at DESC;

-- Count users
-- SELECT COUNT(*) as total_users FROM users;

-- View users by role
-- SELECT role, COUNT(*) as count FROM users GROUP BY role;

