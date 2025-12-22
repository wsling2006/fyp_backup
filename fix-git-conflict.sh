#!/bin/bash
# Quick fix for git pull conflict

echo "🔧 Resolving git conflict..."

# Stash local changes
git stash

# Pull latest changes
git pull origin main

# Apply stashed changes back (this will merge the migration scripts)
git stash pop

# If there's a conflict, show it
if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Merge conflict detected in package.json"
    echo "The migration scripts are already in the pulled version."
    echo "Running: git checkout --theirs backend/package.json"
    git checkout --theirs backend/package.json
    git stash drop
fi

echo ""
echo "✅ Git conflict resolved!"
echo ""
echo "Now restart backend:"
echo "  pm2 restart backend"
echo "  pm2 logs backend --lines 30"
