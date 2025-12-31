#!/bin/bash
# Check what accountant users exist
# Run this on EC2

echo "=========================================="
echo "Check Accountant Users"
echo "=========================================="
echo ""

echo "All users in database:"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT email, role, is_active 
FROM users 
ORDER BY role, email;
"

echo ""
echo "=========================================="
echo "Try logging in with one of these emails"
echo "=========================================="
