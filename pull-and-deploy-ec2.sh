#!/bin/bash
# Pull and deploy the fix on EC2
# Run this on EC2 after pushing to GitHub

echo "📥 Pulling File Upload Fix from GitHub"
echo "======================================="
echo ""

set -e

# Check if we're in the right directory
if [ ! -d ".git" ]; then
  echo "❌ Error: Not in a git repository"
  exit 1
fi

# Check current status
echo "📊 Current status:"
git status --short
echo ""

# Stash any local changes (just in case)
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "⚠️  Local changes detected, stashing..."
  git stash
  echo "✅ Changes stashed"
  echo ""
fi

# Pull from GitHub
echo "📥 Pulling latest changes from GitHub..."
CURRENT_BRANCH=$(git branch --show-current)
echo "Branch: $CURRENT_BRANCH"
echo ""

git pull origin $CURRENT_BRANCH

if [ $? -ne 0 ]; then
  echo "❌ Pull failed!"
  exit 1
fi

echo "✅ Successfully pulled from GitHub!"
echo ""

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x deploy-upload-fix-ec2.sh
chmod +x test-upload-fix-ec2.sh
chmod +x diagnose-files.sh
echo "✅ Scripts ready"
echo ""

# Now deploy
echo "🚀 Deploying the fix..."
echo ""
./deploy-upload-fix-ec2.sh
