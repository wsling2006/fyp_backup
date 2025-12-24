#!/bin/bash
# EC2 Log Analysis Script
# This script helps analyze the enhanced logs to diagnose 403 issues

echo "=========================================="
echo "LOG ANALYSIS FOR 403 DEBUGGING"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}Analyzing recent logs...${NC}"
echo ""

# Get PM2 log file location
LOG_FILE=$(pm2 info backend 2>/dev/null | grep "out log path" | awk '{print $NF}')

if [ -z "$LOG_FILE" ]; then
    LOG_FILE=$(pm2 info fyp-backend 2>/dev/null | grep "out log path" | awk '{print $NF}')
fi

if [ -z "$LOG_FILE" ]; then
    echo -e "${RED}Could not find PM2 log file. Is backend running?${NC}"
    echo "Try: pm2 list"
    exit 1
fi

echo -e "${GREEN}Log file: $LOG_FILE${NC}"
echo ""

echo "=========================================="
echo "1. JWT STRATEGY VALIDATIONS"
echo "=========================================="
echo -e "${BLUE}Checking if JwtStrategy.validate is being called...${NC}"
tail -100 "$LOG_FILE" | grep -A 2 "JwtStrategy.validate" || echo "No JwtStrategy validations found"
echo ""

echo "=========================================="
echo "2. JWT AUTH GUARD CHECKS"
echo "=========================================="
echo -e "${BLUE}Checking JwtAuthGuard authentication flow...${NC}"
tail -100 "$LOG_FILE" | grep -A 2 "JwtAuthGuard" || echo "No JwtAuthGuard logs found"
echo ""

echo "=========================================="
echo "3. ROLES GUARD CHECKS"
echo "=========================================="
echo -e "${BLUE}Checking RolesGuard authorization flow...${NC}"
tail -100 "$LOG_FILE" | grep -A 2 "RolesGuard" || echo "No RolesGuard logs found"
echo ""

echo "=========================================="
echo "4. ERRORS"
echo "=========================================="
echo -e "${BLUE}Checking for errors...${NC}"
tail -100 "$LOG_FILE" | grep -i -E "error|exception|fail" || echo "No errors found"
echo ""

echo "=========================================="
echo "RECOMMENDATIONS"
echo "=========================================="
echo ""
echo "If you see:"
echo "  - No JwtStrategy logs: The JWT strategy is not being invoked"
echo "  - JwtAuthGuard logs but req.user is undefined: Passport is not attaching user"
echo "  - RolesGuard with req.user undefined: Guard order or timing issue"
echo ""
echo "Next steps:"
echo "  1. Make a request to /api/purchase-requests with your JWT token"
echo "  2. Run this script again to see the latest logs"
echo "  3. Share the output to diagnose the exact issue"
echo ""
