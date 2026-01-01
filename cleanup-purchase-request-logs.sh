#!/bin/bash

# Cleanup script for purchase request audit logs
# Removes old VIEW logs that spam the database

echo "=========================================="
echo "🧹 Purchase Request Audit Log Cleanup"
echo "=========================================="
echo ""

# Database credentials
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="fyp_user"
DB_PASSWORD="GL5jYNDqsOVkx6tIfIS2eUonM"
DB_NAME="fyp_db"

echo "1️⃣ Current purchase request audit logs:"
echo "------------------------------------------"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    action, 
    COUNT(*) as count,
    MIN(created_at) as first_log,
    MAX(created_at) as last_log
FROM audit_logs 
WHERE resource = 'purchase_request'
GROUP BY action 
ORDER BY count DESC;
"

echo ""
echo "2️⃣ Deleting VIEW logs (spam from page refreshes):"
echo "------------------------------------------"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
DELETE FROM audit_logs 
WHERE action IN (
    'VIEW_ALL_PURCHASE_REQUESTS',
    'VIEW_PURCHASE_REQUEST'
);
"

echo ""
echo "3️⃣ Remaining purchase request audit logs:"
echo "------------------------------------------"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    action, 
    COUNT(*) as count
FROM audit_logs 
WHERE resource = 'purchase_request'
GROUP BY action 
ORDER BY action;
"

echo ""
echo "=========================================="
echo "✅ Cleanup Complete!"
echo "=========================================="
echo ""
echo "📝 From now on, only these actions will be logged:"
echo "   ✅ CREATE_PURCHASE_REQUEST"
echo "   ✅ APPROVE_PURCHASE_REQUEST"
echo "   ✅ REJECT_PURCHASE_REQUEST"
echo "   ✅ DELETE_PURCHASE_REQUEST"
echo ""
echo "❌ These will NOT be logged (prevents spam):"
echo "   ❌ VIEW_ALL_PURCHASE_REQUESTS"
echo "   ❌ VIEW_PURCHASE_REQUEST"
echo ""
