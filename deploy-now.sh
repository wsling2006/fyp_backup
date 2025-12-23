#!/bin/bash

# QUICK DEPLOYMENT - Run this on EC2
# This pulls the fix scripts and deploys everything

set -e

echo "=========================================="
echo "DEPLOYING 403 FIX"
echo "=========================================="
echo ""

cd /home/ubuntu/fyp_system

echo "1. Pulling latest code from GitHub (includes fix scripts)..."
git pull origin main

echo ""
echo "2. Making scripts executable..."
chmod +x COMPLETE_403_FIX.sh
chmod +x check-frontend-env.sh
chmod +x DEPLOY_JWT_FIX.sh

echo ""
echo "3. Running complete fix..."
./COMPLETE_403_FIX.sh
