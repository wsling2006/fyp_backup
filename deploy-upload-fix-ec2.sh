#!/bin/bash
# Deploy the file upload fix to EC2
# This fixes the proxy corrupting binary file uploads

echo "🔧 Deploying File Upload Fix to EC2"
echo "===================================="
echo ""
echo "Issue: Next.js proxy was calling request.text() which corrupted binary uploads"
echo "Fix: Changed to use request.body to preserve binary data"
echo ""

set -e  # Exit on error

# Check we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
  echo "❌ Error: Must run from fyp_system directory"
  exit 1
fi

echo "📦 Step 1: Rebuilding frontend with the fix..."
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build the frontend
echo "Building Next.js frontend..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

echo "✅ Frontend built successfully"
echo ""

echo "🔄 Step 2: Restarting frontend with PM2..."
pm2 restart frontend || pm2 start npm --name "frontend" -- start

echo "✅ Frontend restarted"
echo ""

echo "⏳ Step 3: Waiting for frontend to be ready..."
sleep 5

# Check if frontend is responding
if curl -s http://localhost:3001 > /dev/null; then
  echo "✅ Frontend is responding"
else
  echo "⚠️  Frontend might not be ready yet, check with: pm2 logs frontend"
fi

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🧪 Testing Instructions:"
echo "1. Go to accountant dashboard: http://<your-ec2-ip>:3001/dashboard/accountant"
echo "2. Upload a NEW PDF file"
echo "3. Download it and verify it's NOT blank"
echo ""
echo "📊 Check logs:"
echo "  pm2 logs frontend --lines 50"
echo ""
echo "🔍 Verify files in database:"
echo "  ~/diagnose-files.sh"
echo ""
