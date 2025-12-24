#!/bin/bash
# Fix missing columns in purchase_requests table

echo "=========================================="
echo "FIX PURCHASE_REQUESTS TABLE SCHEMA"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}This script will check and add missing columns to purchase_requests table${NC}"
echo ""

# Database connection details (update these if different)
DB_NAME="fyp_system"
DB_USER="postgres"

echo -e "${YELLOW}Step 1: Checking current table structure...${NC}"
psql -U $DB_USER -d $DB_NAME -c "\d purchase_requests"

echo ""
echo -e "${YELLOW}Step 2: Attempting to add missing columns (will skip if they exist)...${NC}"

# Try to add title column
echo "Adding 'title' column..."
psql -U $DB_USER -d $DB_NAME -c "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS title VARCHAR(255);" 2>&1 | grep -v "already exists" || true

# Try to add description column
echo "Adding 'description' column..."
psql -U $DB_USER -d $DB_NAME -c "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS description TEXT;" 2>&1 | grep -v "already exists" || true

# Try to add department column
echo "Adding 'department' column..."
psql -U $DB_USER -d $DB_NAME -c "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS department VARCHAR(50);" 2>&1 | grep -v "already exists" || true

# Try to add priority column
echo "Adding 'priority' column..."
psql -U $DB_USER -d $DB_NAME -c "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS priority INT DEFAULT 1;" 2>&1 | grep -v "already exists" || true

# Try to add estimated_amount column
echo "Adding 'estimated_amount' column..."
psql -U $DB_USER -d $DB_NAME -c "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS estimated_amount DECIMAL(12,2);" 2>&1 | grep -v "already exists" || true

# Try to add approved_amount column
echo "Adding 'approved_amount' column..."
psql -U $DB_USER -d $DB_NAME -c "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(12,2);" 2>&1 | grep -v "already exists" || true

echo ""
echo -e "${YELLOW}Step 3: Checking updated table structure...${NC}"
psql -U $DB_USER -d $DB_NAME -c "\d purchase_requests"

echo ""
echo -e "${GREEN}Done! If columns were missing, they have been added.${NC}"
echo ""
echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo "1. Verify the table structure looks correct above"
echo "2. Restart the backend: pm2 restart backend"
echo "3. Test creating a purchase request"
echo "=========================================="
