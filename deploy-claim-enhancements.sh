#!/bin/bash

# Deployment Script for Claim Upload Security Enhancements
# December 26, 2025

set -e  # Exit on error

echo "=============================================="
echo "Deploying Claim Upload Security Enhancements"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on EC2 or local
if [ -f "/home/ubuntu/fyp_system/ecosystem.config.js" ]; then
    echo -e "${BLUE}Detected EC2 environment${NC}"
    PROJECT_DIR="/home/ubuntu/fyp_system"
    IS_EC2=true
else
    echo -e "${BLUE}Detected local environment${NC}"
    PROJECT_DIR="/Users/jw/fyp_system"
    IS_EC2=false
fi

cd "$PROJECT_DIR"

echo ""
echo "Step 1: Pulling latest changes from git..."
git pull origin main

echo ""
echo "Step 2: Installing/updating dependencies..."

# Backend dependencies
echo "  - Backend dependencies..."
cd "$PROJECT_DIR/backend"
npm install

# Frontend dependencies
echo "  - Frontend dependencies..."
cd "$PROJECT_DIR/frontend"
npm install

echo ""
echo "Step 3: Building frontend..."
cd "$PROJECT_DIR/frontend"
npm run build

echo ""
echo "Step 4: Building backend..."
cd "$PROJECT_DIR/backend"
npm run build

if [ "$IS_EC2" = true ]; then
    echo ""
    echo "Step 5: Checking ClamAV daemon status..."
    if systemctl is-active --quiet clamav-daemon; then
        echo -e "${GREEN}✓ ClamAV daemon is running${NC}"
    else
        echo -e "${YELLOW}⚠ ClamAV daemon is not running. Starting...${NC}"
        sudo systemctl start clamav-daemon
        sudo systemctl enable clamav-daemon
        echo -e "${GREEN}✓ ClamAV daemon started${NC}"
    fi

    echo ""
    echo "Step 6: Verifying file_hash column exists in database..."
    cd "$PROJECT_DIR/backend"
    
    # Check if column exists
    COLUMN_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_name='claims' AND column_name='file_hash';" 2>/dev/null || echo "0")
    
    if [ "$COLUMN_EXISTS" -eq "1" ]; then
        echo -e "${GREEN}✓ file_hash column already exists${NC}"
    else
        echo -e "${YELLOW}⚠ Adding file_hash column...${NC}"
        PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -f add-file-hash-column.sql
        echo -e "${GREEN}✓ file_hash column added${NC}"
    fi

    echo ""
    echo "Step 7: Restarting PM2 processes..."
    cd "$PROJECT_DIR"
    pm2 restart ecosystem.config.js --update-env
    
    echo ""
    echo "Step 8: Checking PM2 status..."
    pm2 status

    echo ""
    echo "Step 9: Checking application logs..."
    echo "Backend logs:"
    pm2 logs backend --lines 5 --nostream
    echo ""
    echo "Frontend logs:"
    pm2 logs frontend --lines 5 --nostream

else
    echo ""
    echo "Step 5: Checking ClamAV daemon status (local)..."
    if brew services list | grep -q "clamav.*started"; then
        echo -e "${GREEN}✓ ClamAV daemon is running${NC}"
    else
        echo -e "${YELLOW}⚠ ClamAV daemon is not running. Starting...${NC}"
        brew services start clamav
        echo -e "${GREEN}✓ ClamAV daemon started${NC}"
    fi

    echo ""
    echo -e "${YELLOW}Note: For local development, make sure to:${NC}"
    echo "1. Start backend: cd backend && npm run start:dev"
    echo "2. Start frontend: cd frontend && npm run dev"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "What was deployed:"
echo "✅ Enhanced user feedback during file upload"
echo "✅ Malware scanning status display"
echo "✅ Security notice in upload modal"
echo "✅ Better error message styling"
echo ""
echo "Existing security features (already working):"
echo "✅ Upload button disabled after claim submission"
echo "✅ Duplicate file prevention (SHA-256 hash)"
echo "✅ ClamAV malware scanning"
echo "✅ One claim per purchase request"
echo ""
echo "Testing:"
echo "Run: ./test-claim-security.sh"
echo ""
echo "Manual verification:"
echo "1. Login to the application"
echo "2. Create and approve a purchase request"
echo "3. Upload a claim - should see scanning feedback"
echo "4. Verify upload button disappears after submission"
echo "5. Try uploading same file to another request - should be blocked"
echo ""
echo "Done! 🚀"
