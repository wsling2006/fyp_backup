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

# Try to get database details from .env file
if [ -f "backend/.env" ]; then
    DB_NAME=$(grep DB_DATABASE backend/.env | cut -d '=' -f2 | tr -d ' "' || echo "fyp_system")
    DB_USER=$(grep DB_USERNAME backend/.env | cut -d '=' -f2 | tr -d ' "' || echo "postgres")
    DB_HOST=$(grep DB_HOST backend/.env | cut -d '=' -f2 | tr -d ' "' || echo "localhost")
    DB_PORT=$(grep DB_PORT backend/.env | cut -d '=' -f2 | tr -d ' "' || echo "5432")
    echo -e "${GREEN}Found database config from .env:${NC}"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT"
else
    # Default values if .env not found
    DB_NAME="fyp_system"
    DB_USER="postgres"
    DB_HOST="localhost"
    DB_PORT="5432"
    echo -e "${YELLOW}Using default database config (no .env found)${NC}"
fi

echo -e "${YELLOW}Step 1: Checking current table structure...${NC}"
# Try different connection methods
if sudo -u postgres psql -d $DB_NAME -c "\d purchase_requests" 2>/dev/null; then
    PSQL_CMD="sudo -u postgres psql -d $DB_NAME"
elif psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "\d purchase_requests" 2>/dev/null; then
    PSQL_CMD="psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME"
elif psql -d $DB_NAME -c "\d purchase_requests" 2>/dev/null; then
    PSQL_CMD="psql -d $DB_NAME"
else
    echo -e "${RED}ERROR: Cannot connect to database!${NC}"
    echo ""
    echo "Please try manually with one of these commands:"
    echo "  sudo -u postgres psql -d $DB_NAME"
    echo "  psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME"
    echo "  psql -d $DB_NAME"
    exit 1
fi

echo -e "${GREEN}Connected to database successfully!${NC}"

echo ""
echo -e "${YELLOW}Step 2: Attempting to add missing columns (will skip if they exist)...${NC}"

# Try to add title column
echo "Adding 'title' column..."
$PSQL_CMD -c "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS title VARCHAR(255);" 2>&1 | grep -v "already exists" || true

# Try to add description column
echo "Adding 'description' column..."
$PSQL_CMD -c "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS description TEXT;" 2>&1 | grep -v "already exists" || true

# Try to add department column
echo "Adding 'department' column..."
$PSQL_CMD -c "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS department VARCHAR(50);" 2>&1 | grep -v "already exists" || true

# Try to add priority column
echo "Adding 'priority' column..."
$PSQL_CMD -c "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS priority INT DEFAULT 1;" 2>&1 | grep -v "already exists" || true

# Try to add estimated_amount column
echo "Adding 'estimated_amount' column..."
$PSQL_CMD -c "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS estimated_amount DECIMAL(12,2);" 2>&1 | grep -v "already exists" || true

# Try to add approved_amount column
echo "Adding 'approved_amount' column..."
$PSQL_CMD -c "ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(12,2);" 2>&1 | grep -v "already exists" || true

echo ""
echo -e "${YELLOW}Step 3: Checking updated table structure...${NC}"
$PSQL_CMD -c "\d purchase_requests"

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
