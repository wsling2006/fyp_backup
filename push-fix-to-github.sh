#!/bin/bash
# Push the file upload fix to GitHub
# Run this on LOCAL machine

echo "📤 Pushing File Upload Fix to GitHub"
echo "====================================="
echo ""

set -e

# Check if we're in the right directory
if [ ! -d ".git" ]; then
  echo "❌ Error: Not in a git repository"
  exit 1
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "📝 Uncommitted changes detected"
  echo ""
  
  # Show what changed
  echo "Files modified:"
  git status --short
  echo ""
  
  # Stage the fix
  echo "📦 Staging the fix..."
  git add frontend/app/api/\[...path\]/route.ts
  git add BLANK_FILE_UPLOAD_FIX.md
  git add deploy-upload-fix-ec2.sh
  git add test-upload-fix-ec2.sh
  git add diagnose-files.sh 2>/dev/null || true
  
  echo "✅ Staged files"
  echo ""
  
  # Commit
  echo "💾 Committing..."
  git commit -m "fix: Preserve binary data in Next.js proxy to prevent file upload corruption

Root cause: Proxy was calling request.text() which corrupted binary uploads
Solution: Use request.body (ReadableStream) to preserve binary data integrity

This fixes the blank PDF download issue - files are now uploaded correctly
and can be downloaded with content intact.

Testing: Upload new PDF → Download → Verify content exists"
  
  echo "✅ Committed"
  echo ""
else
  echo "ℹ️  No changes to commit"
fi

# Push to GitHub
echo "🚀 Pushing to GitHub..."
CURRENT_BRANCH=$(git branch --show-current)
echo "Branch: $CURRENT_BRANCH"
echo ""

git push origin $CURRENT_BRANCH

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Successfully pushed to GitHub!"
  echo ""
  echo "📥 Next: SSH to EC2 and run:"
  echo ""
  echo "  cd ~/fyp_system"
  echo "  git pull origin $CURRENT_BRANCH"
  echo "  chmod +x deploy-upload-fix-ec2.sh"
  echo "  ./deploy-upload-fix-ec2.sh"
  echo ""
else
  echo ""
  echo "❌ Push failed!"
  echo "Check your GitHub credentials and network connection"
  exit 1
fi
