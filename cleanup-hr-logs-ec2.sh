#!/bin/bash

# Cleanup script for HR audit logs on EC2
# This removes all old HR audit logs with incorrect action names

echo "=== Cleaning up old HR audit logs ==="
echo ""

# Database credentials
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="fyp_user"
DB_PASSWORD="GL5jYNDqsOVkx6tIfIS2eUonM"
DB_NAME="fyp_db"

echo "1. Current HR audit logs in database:"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT action, COUNT(*) FROM audit_logs WHERE action LIKE '%EMPLOYEE%' GROUP BY action ORDER BY action;"

echo ""
echo "2. Deleting all HR audit logs (old incorrect action names)..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM audit_logs WHERE action IN ('HR_VIEW_EMPLOYEE_PROFILE', 'HR_VIEW_EMPLOYEE_LIST', 'HR_VIEW_EMPLOYEE_DOCUMENTS', 'HR_SEARCH_EMPLOYEES', 'HR_CREATE_EMPLOYEE', 'HR_UPDATE_EMPLOYEE', 'HR_DELETE_EMPLOYEE', 'HR_UPLOAD_DOCUMENT', 'HR_DOWNLOAD_DOCUMENT', 'HR_DELETE_DOCUMENT');"

echo ""
echo "3. Verification - remaining EMPLOYEE audit logs:"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT action, COUNT(*) FROM audit_logs WHERE action LIKE '%EMPLOYEE%' GROUP BY action ORDER BY action;"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Note: From now on, only VIEW_EMPLOYEE_PROFILE (without HR_ prefix) will be logged"
echo "when HR users view employee profiles."
