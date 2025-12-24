#!/bin/bash
# Diagnostic script to check database connection and schema

echo "=========================================="
echo "DATABASE CONNECTION DIAGNOSTIC"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Read backend .env
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}Backend .env configuration:${NC}"
    echo "---"
    grep "^DB_" backend/.env | while IFS= read -r line; do
        key=$(echo "$line" | cut -d '=' -f1)
        value=$(echo "$line" | cut -d '=' -f2)
        if [[ "$key" == "DB_PASSWORD" ]]; then
            echo "$key=******* (hidden)"
        else
            echo "$line"
        fi
    done
    echo "---"
    echo ""
    
    # Extract values
    DB_NAME=$(grep "^DB_NAME=" backend/.env | cut -d '=' -f2 | tr -d ' "')
    DB_USER=$(grep "^DB_USERNAME=" backend/.env | cut -d '=' -f2 | tr -d ' "')
    DB_HOST=$(grep "^DB_HOST=" backend/.env | cut -d '=' -f2 | tr -d ' "')
    DB_PORT=$(grep "^DB_PORT=" backend/.env | cut -d '=' -f2 | tr -d ' "')
    DB_PASS=$(grep "^DB_PASSWORD=" backend/.env | cut -d '=' -f2 | tr -d ' "')
    
    export PGPASSWORD="$DB_PASS"
else
    echo -e "${RED}ERROR: backend/.env not found!${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Testing database connection...${NC}"
if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connection successful!${NC}"
else
    echo -e "${RED}✗ Connection failed!${NC}"
    echo "Check your database credentials and make sure PostgreSQL is running."
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Listing all databases...${NC}"
psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -l | grep -E "Name|$DB_NAME|fyp"

echo ""
echo -e "${YELLOW}Step 3: Checking purchase_requests table in $DB_NAME...${NC}"
psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -c "\d purchase_requests"

echo ""
echo -e "${YELLOW}Step 4: Counting records in purchase_requests...${NC}"
COUNT=$(psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM purchase_requests;" 2>/dev/null | tr -d ' ')
echo "Total records: $COUNT"

echo ""
echo -e "${YELLOW}Step 5: Checking backend logs for database connection...${NC}"
pm2 logs backend --nostream --lines 10 | grep -i "database\|connect\|postgres" || echo "No database connection logs found"

echo ""
echo "=========================================="
echo "DIAGNOSIS SUMMARY"
echo "=========================================="
echo -e "${BLUE}Backend is configured to connect to:${NC}"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo ""
echo -e "${BLUE}Current table schema:${NC}"
psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'purchase_requests' ORDER BY ordinal_position;" -t

echo ""
echo "=========================================="
echo "WHAT TO DO NEXT"
echo "=========================================="
echo ""
if psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -c "\d purchase_requests" 2>/dev/null | grep -q "created_by_user_id"; then
    echo -e "${GREEN}✓ Table has correct schema (created_by_user_id exists)${NC}"
    echo "Backend should work. Try restarting: pm2 restart backend"
else
    echo -e "${RED}✗ Table has OLD schema (missing created_by_user_id)${NC}"
    echo ""
    echo "Run one of these fixes:"
    echo "  Option A (preserve data): psql -U $DB_USER -h $DB_HOST -d $DB_NAME -f backend/migrate-purchase-requests-schema.sql"
    echo "  Option B (clean slate):   psql -U $DB_USER -h $DB_HOST -d $DB_NAME -f backend/recreate-purchase-requests-table.sql"
fi

unset PGPASSWORD
