#!/bin/bash

# Git Commit and Push Helper Script
# Prepares and pushes the Claims Download Feature to GitHub

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "Git Commit and Push Helper"
echo "Claims Download Feature"
echo -e "==========================================${NC}"
echo ""

# Check current directory
if [ ! -f "ecosystem.config.js" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Step 1: Show current status
echo -e "${YELLOW}Current Git Status:${NC}"
git status
echo ""

# Step 2: Check for uncommitted changes
echo -e "${YELLOW}Files to be committed:${NC}"
echo ""
echo "Modified files:"
echo "  • backend/src/purchase-requests/purchase-request.controller.ts"
echo ""
echo "New documentation files:"
echo "  • CLAIMS_DOWNLOAD_FEATURE.md"
echo "  • IMPLEMENTATION_SUMMARY_CLAIMS_DOWNLOAD.md"
echo "  • AWS_DEPLOYMENT_GUIDE.md"
echo "  • deploy-ec2.sh"
echo "  • test-claims-download.sh"
echo "  • git-push.sh (this file)"
echo ""

# Check if frontend file is already staged/committed
if git diff --cached --name-only | grep -q "frontend/app/purchase-requests/page.tsx"; then
    echo -e "${GREEN}✓ Frontend changes already staged${NC}"
elif git diff --name-only | grep -q "frontend/app/purchase-requests/page.tsx"; then
    echo "  • frontend/app/purchase-requests/page.tsx"
else
    echo -e "${YELLOW}⚠ Frontend changes may already be committed${NC}"
fi
echo ""

# Step 3: Ask for confirmation
read -p "Do you want to proceed with commit and push? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Aborted by user${NC}"
    exit 0
fi

# Step 4: Add files
echo -e "${YELLOW}Adding files to git...${NC}"
git add backend/src/purchase-requests/purchase-request.controller.ts
git add ecosystem.config.js
git add CLAIMS_DOWNLOAD_FEATURE.md
git add IMPLEMENTATION_SUMMARY_CLAIMS_DOWNLOAD.md
git add AWS_DEPLOYMENT_GUIDE.md
git add EC2_TROUBLESHOOTING.md
git add QUICK_DEPLOYMENT_REFERENCE.md
git add READY_TO_DEPLOY.md
git add deploy-ec2.sh
git add ec2-fix.sh
git add test-claims-download.sh
git add git-push.sh

# Add frontend file if it has changes
if git diff --name-only | grep -q "frontend/app/purchase-requests/page.tsx"; then
    git add frontend/app/purchase-requests/page.tsx
    echo -e "${GREEN}✓ Added frontend changes${NC}"
fi

echo -e "${GREEN}✓ Files added${NC}"
echo ""

# Step 5: Commit
echo -e "${YELLOW}Creating commit...${NC}"
git commit -m "feat: Add claims download feature for accountants

- Added GET /purchase-requests/claims/:id/download endpoint
- Added ViewClaimsModal component with download functionality
- Accountants can now view and download claim receipts
- Added audit logging for downloads
- Includes role-based access control and ownership validation
- Updated documentation with feature details and deployment guide

Changes:
- Backend: Added download endpoint in purchase-request.controller.ts
- Frontend: Added ViewClaimsModal component in page.tsx
- Docs: Added comprehensive documentation and deployment guides
- Scripts: Added deployment and test scripts for EC2

Security:
- JWT authentication required
- Role-based access control (accountants/super admins see all)
- Ownership validation for non-admin users
- All downloads logged to audit trail
- Proper error handling and file validation"

echo -e "${GREEN}✓ Commit created${NC}"
echo ""

# Step 6: Show commit
echo -e "${YELLOW}Commit details:${NC}"
git log -1 --stat
echo ""

# Step 7: Push
echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Successfully pushed to GitHub${NC}"
else
    echo -e "${RED}✗ Push failed${NC}"
    exit 1
fi
echo ""

# Step 8: Summary
echo -e "${BLUE}=========================================="
echo "Success!"
echo -e "==========================================${NC}"
echo ""
echo -e "${GREEN}✓ Changes committed and pushed to GitHub${NC}"
echo ""
echo -e "${YELLOW}Next Steps on AWS EC2:${NC}"
echo ""
echo "1. SSH into your EC2 instance:"
echo "   ssh -i your-key.pem ubuntu@your-ec2-ip"
echo ""
echo "2. Navigate to project directory:"
echo "   cd /path/to/fyp_system"
echo ""
echo "3. Pull the latest changes:"
echo "   git pull origin main"
echo ""
echo "4. Run the deployment script:"
echo "   ./deploy-ec2.sh"
echo ""
echo "Alternative manual deployment:"
echo "   cd backend && npm run build"
echo "   cd ../frontend && npm run build"
echo "   pm2 restart ecosystem.config.js --env production"
echo ""
echo -e "${BLUE}==========================================${NC}"
echo ""
echo "For detailed deployment instructions, see:"
echo "  AWS_DEPLOYMENT_GUIDE.md"
echo ""
echo -e "${GREEN}Ready for AWS deployment!${NC}"
echo ""
