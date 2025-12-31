#!/bin/bash
# Reset Admin Password on EC2
# Run this on EC2

echo "=========================================="
echo "Reset Admin Password"
echo "=========================================="
echo ""

cd ~/fyp_system/backend

echo "Checking current admin account..."
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT id, email, role, is_active, created_at 
FROM users 
WHERE role = 'super_admin' OR email LIKE '%admin%';
"

echo ""
echo "What is the admin email in your .env file?"
echo "Checking .env file..."
grep "ADMIN_EMAIL" .env || echo "ADMIN_EMAIL not found in .env"
grep "ADMIN_PASSWORD" .env || echo "ADMIN_PASSWORD not found in .env"

echo ""
echo "=========================================="
echo "To reset admin password, we need to:"
echo "1. Check what email admin@example.com has in database"
echo "2. Update the password in .env file"
echo "3. Restart backend so it re-seeds the admin account"
echo ""
echo "Current users in database:"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT email, role, is_active FROM users;
"

echo ""
echo "=========================================="
