#!/bin/bash

# Database Verification Script for EC2
# Checks the actual state of your database

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           EC2 Database State Verification                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Not in backend directory. Please cd to backend first.${NC}"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}1. Checking All Tables in Database...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
npm run typeorm query "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;" 2>&1 | grep -v "typeorm\|ts-node"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}2. Checking 'employees' Table...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
EMP_TABLE=$(npm run typeorm query "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='employees';" 2>&1 | grep -E "^\s+[0-9]" | awk '{print $1}')

if [ "$EMP_TABLE" = "1" ]; then
    echo -e "${GREEN}✓ employees table EXISTS${NC}"
    echo ""
    echo "Columns in employees table:"
    npm run typeorm query "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='employees' ORDER BY ordinal_position;" 2>&1 | grep -v "typeorm\|ts-node"
else
    echo -e "${RED}✗ employees table DOES NOT EXIST${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}3. Checking 'employee_documents' Table...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
DOC_TABLE=$(npm run typeorm query "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='employee_documents';" 2>&1 | grep -E "^\s+[0-9]" | awk '{print $1}')

if [ "$DOC_TABLE" = "1" ]; then
    echo -e "${GREEN}✓ employee_documents table EXISTS${NC}"
    echo ""
    echo "Columns in employee_documents table:"
    npm run typeorm query "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='employee_documents' ORDER BY ordinal_position;" 2>&1 | grep -v "typeorm\|ts-node"
else
    echo -e "${RED}✗ employee_documents table DOES NOT EXIST${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}4. Checking 'claims' Table Columns...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Checking for specific columns:"
MALWARE=$(npm run typeorm query "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='claims' AND column_name='malware_scan_status';" 2>&1 | grep -E "^\s+[0-9]" | awk '{print $1}')
RECEIPT=$(npm run typeorm query "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='claims' AND column_name='receipt_file_data';" 2>&1 | grep -E "^\s+[0-9]" | awk '{print $1}')
FILE_HASH=$(npm run typeorm query "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='claims' AND column_name='file_hash';" 2>&1 | grep -E "^\s+[0-9]" | awk '{print $1}')

if [ "$MALWARE" = "1" ]; then
    echo -e "${GREEN}✓ malware_scan_status EXISTS${NC}"
else
    echo -e "${RED}✗ malware_scan_status MISSING${NC}"
fi

if [ "$RECEIPT" = "1" ]; then
    echo -e "${GREEN}✓ receipt_file_data EXISTS${NC}"
else
    echo -e "${RED}✗ receipt_file_data MISSING${NC}"
fi

if [ "$FILE_HASH" = "1" ]; then
    echo -e "${GREEN}✓ file_hash EXISTS${NC}"
else
    echo -e "${RED}✗ file_hash MISSING${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}5. Checking Migration Records...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
npm run typeorm query "SELECT timestamp, name FROM migrations ORDER BY timestamp;" 2>&1 | grep -v "typeorm\|ts-node"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}6. Migration Status from TypeORM...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
npm run typeorm migration:show 2>&1 | tail -15
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$EMP_TABLE" = "1" ] && [ "$DOC_TABLE" = "1" ]; then
    echo -e "${GREEN}✅ HR tables exist - migration completed${NC}"
elif [ "$EMP_TABLE" = "1" ] || [ "$DOC_TABLE" = "1" ]; then
    echo -e "${YELLOW}⚠️  Partial HR tables - migration incomplete${NC}"
else
    echo -e "${RED}❌ No HR tables - migration NOT run${NC}"
    echo ""
    echo "Next steps:"
    echo "1. First sync old migrations: ../emergency-sync-migrations.sh"
    echo "2. Then run: npm run typeorm migration:run"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
