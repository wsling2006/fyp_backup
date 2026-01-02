#!/bin/bash

# 🔧 Deploy File Hash Constraint Fix to EC2

echo "========================================="
echo "🚀 Deploying File Hash Constraint Fix"
echo "========================================="
echo ""

# Step 1: Pull latest code
echo "📥 Step 1: Pulling latest code from GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Failed to pull from GitHub"
    exit 1
fi

echo "✅ Code pulled successfully"
echo ""

# Step 2: Run migration
echo "🔄 Step 2: Running database migration..."
cd backend
npm run typeorm migration:run

if [ $? -ne 0 ]; then
    echo "❌ Migration failed"
    exit 1
fi

echo "✅ Migration completed"
echo ""

# Step 3: Rebuild backend
echo "🔨 Step 3: Building backend..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Step 4: Restart backend
echo "♻️  Step 4: Restarting backend service..."
pm2 restart backend

if [ $? -ne 0 ]; then
    echo "❌ Failed to restart backend"
    exit 1
fi

echo "✅ Backend restarted"
echo ""

# Step 5: Check status
echo "📊 Step 5: Checking service status..."
pm2 status backend

echo ""
echo "========================================="
echo "✅ Deployment completed successfully!"
echo "========================================="
echo ""
echo "📝 What was fixed:"
echo "  • Removed UNIQUE constraint on file_hash"
echo "  • Same file can now be uploaded multiple times"
echo "  • Can re-upload files after deletion"
echo "  • No more 'duplicate key' errors"
echo ""
echo "🧪 Test it:"
echo "  1. Create announcement"
echo "  2. Upload same file 3 times"
echo "  3. Should work without errors ✅"
