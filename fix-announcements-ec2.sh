#!/bin/bash

# EC2 Announcement Tables Fix Script
# This script will drop and recreate announcement tables with correct UUID types

set -e  # Exit on any error

DB_HOST="localhost"
DB_PORT="5432"
DB_USER="fyp_user"
DB_PASS="GL5jYNDqsOVkx6tIfIS2eUonM"
DB_NAME="fyp_db"

export PGPASSWORD="$DB_PASS"

echo "=========================================="
echo "EC2 Announcement Tables Fix"
echo "=========================================="
echo ""

echo "Step 1: Dropping existing announcements table..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
DROP TABLE IF EXISTS announcements CASCADE;
"

echo "✓ Old announcements table dropped"
echo ""

echo "Step 2: Removing migration record for CreateAnnouncementTables..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
DELETE FROM migrations WHERE name = 'CreateAnnouncementTables1700000000000';
"

echo "✓ Migration record removed"
echo ""

echo "Step 3: Running migrations to create announcement tables with correct UUID types..."
cd ~/fyp_system/backend
npm run migration:run

echo ""
echo "=========================================="
echo "✅ Fix Complete!"
echo "=========================================="
echo ""
echo "Verifying new tables..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%announcement%'
ORDER BY table_name;
"

echo ""
echo "Checking announcements.created_by column type..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'announcements' 
AND column_name = 'created_by';
"

echo ""
echo "=========================================="
echo "Now restart the backend:"
echo "  pm2 restart backend"
echo "=========================================="
