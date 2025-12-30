#!/bin/bash

# Force Push Claims Feature - Ensures all changes are committed and pushed

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "Force Commit and Push - Claims Download"
echo -e "==========================================${NC}"
echo ""

cd /Users/jw/fyp_system

# Step 1: Check what needs to be committed
echo -e "${YELLOW}Step 1: Checking files...${NC}"
echo ""

# Check if backend controller has download endpoint
if grep -q "downloadClaimReceipt" backend/src/purchase-requests/purchase-request.controller.ts; then
    echo -e "${GREEN}✓ Backend download endpoint exists${NC}"
else
    echo -e "${RED}✗ Backend download endpoint missing${NC}"
    exit 1
fi

# Check if frontend has ViewClaimsModal
if grep -q "ViewClaimsModal" frontend/app/purchase-requests/page.tsx; then
    echo -e "${GREEN}✓ Frontend ViewClaimsModal exists${NC}"
else
    echo -e "${RED}✗ Frontend ViewClaimsModal missing${NC}"
    exit 1
fi

echo ""

# Step 2: Add all necessary files
echo -e "${YELLOW}Step 2: Adding files to git...${NC}"

git add backend/src/purchase-requests/purchase-request.controller.ts
git add frontend/app/purchase-requests/page.tsx
git add ecosystem.config.js
git add AWS_DEPLOYMENT_GUIDE.md
git add CLAIMS_DOWNLOAD_FEATURE.md
git add IMPLEMENTATION_SUMMARY_CLAIMS_DOWNLOAD.md
git add QUICK_DEPLOYMENT_REFERENCE.md
git add EC2_TROUBLESHOOTING.md
git add EC2_FIX_REQUIRED.md
git add READY_TO_DEPLOY.md
git add DEPLOYMENT_MASTER_GUIDE.md
git add DEPLOYMENT_CHECKLIST.md
git add deploy-ec2.sh
git add ec2-fix.sh
git add test-claims-download.sh
git add git-push.sh
git add force-push-claims.sh

echo -e "${GREEN}✓ Files added${NC}"
echo ""

# Step 3: Show what will be committed
echo -e "${YELLOW}Step 3: Files to be committed:${NC}"
git diff --staged --name-only
echo ""

# Step 4: Commit
echo -e "${YELLOW}Step 4: Creating commit...${NC}"

git commit -m "feat: Add complete claims download feature with EC2 fixes

BACKEND CHANGES:
- Added GET /purchase-requests/claims/:id/download endpoint
- Downloads claim receipt files with proper headers
- Role-based access control (accountants see all, users see own)
- Audit logging for all downloads
- File validation and error handling

FRONTEND CHANGES:
- Added ViewClaimsModal component
- View Claims button on purchase requests with claims
- Download receipt button for each claim
- Beautiful UI with color-coded status badges
- Loading states and error handling
- Responsive design

EC2 FIXES:
- Fixed ecosystem.config.js (port configuration)
- Fixes ECONNREFUSED error
- Fixes invalid project directory error
- Added automated deployment scripts

SECURITY:
- JWT authentication required
- Role-based authorization
- Ownership validation
- Audit trail for downloads
- File path validation

DOCUMENTATION:
- Complete deployment guides
- EC2 troubleshooting guide
- Feature documentation
- Deployment checklist

This commit includes all changes for the claims download feature
and fixes for EC2 deployment issues." || echo "No changes to commit (already committed)"

echo -e "${GREEN}✓ Commit created${NC}"
echo ""

# Step 5: Push to GitHub
echo -e "${YELLOW}Step 5: Pushing to GitHub...${NC}"

git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully pushed to GitHub${NC}"
else
    echo -e "${RED}✗ Push failed${NC}"
    exit 1
fi

echo ""

# Step 6: Verify
echo -e "${YELLOW}Step 6: Verification...${NC}"
echo ""

echo "Latest commit:"
git log -1 --oneline
echo ""

echo "Files in commit:"
git diff-tree --no-commit-id --name-only -r HEAD | grep -E "(controller|page\.tsx|ecosystem)" || echo "Check git log for details"
echo ""

# Summary
echo -e "${BLUE}=========================================="
echo "Push Complete!"
echo -e "==========================================${NC}"
echo ""
echo -e "${GREEN}✓ All changes committed and pushed${NC}"
echo ""
echo -e "${YELLOW}Next: Deploy on EC2${NC}"
echo ""
echo "Run on EC2:"
echo "  ssh -i your-key.pem ubuntu@your-ec2-ip"
echo "  cd /home/ubuntu/fyp_system"
echo "  git pull origin main"
echo "  ./ec2-fix.sh"
echo ""
echo -e "${BLUE}==========================================${NC}"
