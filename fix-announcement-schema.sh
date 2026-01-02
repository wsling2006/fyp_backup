#!/bin/bash

# 🔧 Fix Announcement Database Schema on EC2
# This script drops and recreates the announcement tables with correct UUID types

echo "=========================================="
echo "🔧 Fixing Announcement Database Schema"
echo "=========================================="
echo ""

# Database credentials from .env
DB_NAME="fyp_db"
DB_USER="postgres"
DB_PASS="leejw1354"

echo "⚠️  WARNING: This will DELETE all announcement data!"
echo "   Press Ctrl+C to cancel, or wait 5 seconds to continue..."
sleep 5

echo ""
echo "1️⃣ Dropping existing announcement tables..."

# Drop tables in reverse order (due to foreign keys)
PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d $DB_NAME << 'EOF'
DROP TABLE IF EXISTS announcement_attachments CASCADE;
DROP TABLE IF EXISTS announcement_comments CASCADE;
DROP TABLE IF EXISTS announcement_reactions CASCADE;
DROP TABLE IF EXISTS announcement_acknowledgments CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Old tables dropped successfully"
else
    echo "❌ Failed to drop tables"
    exit 1
fi

echo ""
echo "2️⃣ Running announcement migration..."

cd ~/fyp_system/backend
npm run migration:run

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully"
else
    echo "❌ Migration failed"
    exit 1
fi

echo ""
echo "3️⃣ Restarting backend..."

pm2 restart backend

echo ""
echo "=========================================="
echo "✅ Announcement tables fixed!"
echo "=========================================="
echo ""
echo "The announcement tables now have correct UUID types."
echo "Try accessing /announcements again."
echo ""
