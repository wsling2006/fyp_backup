#!/bin/bash

# EC2 Deployment Script - Backend Fix
# This script pulls the latest code and rebuilds the backend after fixing the controller

echo "=== Pulling Latest Code from GitHub ==="
cd ~/fyp_system
git pull origin main

echo ""
echo "=== Rebuilding Backend ==="
cd backend
npm run build

echo ""
echo "=== Restarting Backend with PM2 ==="
pm2 restart backend

echo ""
echo "=== Checking PM2 Status ==="
pm2 status

echo ""
echo "=== Checking Backend Logs (last 20 lines) ==="
pm2 logs backend --lines 20 --nostream

echo ""
echo "=== Backend Deployment Complete ==="
echo "If you see any errors above, check the full logs with: pm2 logs backend"
