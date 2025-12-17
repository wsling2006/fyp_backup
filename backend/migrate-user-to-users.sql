-- Step 1: Check what's in both tables
SELECT 'user (singular) table:' as info;
SELECT id, email, role, created_at FROM "user" ORDER BY created_at DESC;

SELECT 'users (plural) table:' as info;
SELECT id, email, role, created_at FROM users ORDER BY created_at DESC;

-- Step 2: Check if emails already exist in users table
SELECT 
    u1.email as email_in_user_table,
    CASE 
        WHEN u2.email IS NOT NULL THEN 'EXISTS in users table'
        ELSE 'NOT in users table'
    END as status
FROM "user" u1
LEFT JOIN users u2 ON u1.email = u2.email;

-- Step 3: MIGRATE DATA (only if users table doesn't have these emails)
-- This will copy users from "user" table to "users" table
-- Only inserts if email doesn't already exist in users table

INSERT INTO users (
    id,
    email,
    password_hash,
    role,
    phone,
    address,
    emergency_contact,
    mfa_enabled,
    last_password_change,
    otp_code,
    otp_expires_at,
    is_active,
    last_login_at,
    failed_login_attempts,
    account_locked_until,
    created_by_id,
    created_at,
    updated_at
)
SELECT 
    id,
    email,
    password_hash,
    role,
    phone,
    address,
    emergency_contact,
    mfa_enabled,
    last_password_change,
    otp_code,
    otp_expires_at,
    is_active,
    last_login_at,
    failed_login_attempts,
    account_locked_until,
    created_by_id,
    created_at,
    updated_at
FROM "user"
WHERE email NOT IN (SELECT email FROM users)
ON CONFLICT (email) DO NOTHING;

-- Step 4: Verify migration
SELECT 'After migration - users table:' as info;
SELECT id, email, role, created_at FROM users ORDER BY created_at DESC;

-- Step 5: Once verified, you can drop the old table
-- DROP TABLE IF EXISTS "user";

