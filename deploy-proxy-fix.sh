#!/bin/bash

# Deploy proxy fix to EC2 and test
# This script will:
# 1. Commit the proxy fix
# 2. Push to git
# 3. Pull on EC2
# 4. Restart frontend
# 5. Test the download

set -e

echo "=== Deploying Proxy Fix to EC2 ==="
echo ""

# Commit and push the fix
echo "Step 1: Committing and pushing proxy fix..."
git add frontend/app/api/\[...path\]/route.ts
git commit -m "Fix: Stream binary data in Next.js proxy to prevent corruption

- Changed proxy to stream response.body directly for binary files
- Prevents ArrayBuffer conversion that was causing corruption
- Preserves binary data integrity for file downloads
- Fixes blank PDF download issue in frontend"

git push origin main

echo "✅ Pushed to git"
echo ""

echo "Step 2: SSH to EC2 and deploy..."
echo "You'll need to run these commands on EC2:"
echo ""
echo "cd ~/fyp_system"
echo "git pull origin main"
echo "cd frontend"
echo "npm run build"
echo "pm2 restart frontend"
echo "pm2 logs frontend --lines 50"
echo ""
echo "Step 3: Test the fix with:"
echo "cd ~/fyp_system"
echo "bash test-proxy-fix.sh"
echo ""
echo "Then open the browser and test downloading a file from the Super Admin dashboard"
