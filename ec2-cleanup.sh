#!/bin/bash

# 🧹 EC2 Cleanup Script - Remove Old Backups and Unused Files
# This script will clean up old backup directories and files

echo "========================================"
echo "🧹 EC2 CLEANUP - REMOVING OLD BACKUPS"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

cd /home/ubuntu

echo -e "${BLUE}Current directory contents:${NC}"
ls -lh
echo ""

echo -e "${YELLOW}Files/directories to be DELETED:${NC}"
echo "  - fyp (old project)"
echo "  - fyp_system_old (old backup)"
echo "  - fyp_backup_20251219_123429 (old backup)"
echo "  - fyp_system_backup_20251219_183025 (old backup)"
echo "  - fyp_system_backup_20251219_183328 (old backup)"
echo "  - backend_env_backup (env backup)"
echo "  - frontend_env_backup (env backup)"
echo "  - package-lock.json (stray file)"
echo "  - AuthContext.tsx (stray file)"
echo ""

echo -e "${GREEN}Files/directories to be KEPT:${NC}"
echo "  - fyp_system (main project - KEEP)"
echo "  - fyp_db_backup.sql (database backup - KEEP)"
echo ""

echo -e "${RED}⚠️  WARNING: This will permanently delete the listed files!${NC}"
echo ""
read -p "Do you want to proceed with cleanup? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}=== Starting Cleanup ===${NC}"
echo ""

# Function to remove directory/file safely
remove_item() {
    local item=$1
    if [ -e "$item" ]; then
        echo -n "Removing $item... "
        rm -rf "$item"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Done${NC}"
        else
            echo -e "${RED}✗ Failed${NC}"
        fi
    else
        echo "$item - Not found (already removed)"
    fi
}

# Remove old project directories
echo -e "${YELLOW}Removing old project directories:${NC}"
remove_item "fyp"
remove_item "fyp_system_old"
remove_item "fyp_backup_20251219_123429"
remove_item "fyp_system_backup_20251219_183025"
remove_item "fyp_system_backup_20251219_183328"

echo ""
echo -e "${YELLOW}Removing old backup files:${NC}"
remove_item "backend_env_backup"
remove_item "frontend_env_backup"

echo ""
echo -e "${YELLOW}Removing stray files:${NC}"
remove_item "package-lock.json"
remove_item "AuthContext.tsx"

echo ""
echo -e "${BLUE}=== Checking Disk Space Freed ===${NC}"
df -h /home/ubuntu | tail -1
echo ""

echo -e "${BLUE}=== Current Directory Contents (After Cleanup) ===${NC}"
ls -lh
echo ""

echo "========================================"
echo -e "${GREEN}✅ CLEANUP COMPLETE!${NC}"
echo "========================================"
echo ""
echo -e "${GREEN}Remaining files:${NC}"
echo "  ✓ fyp_system - Your main project"
echo "  ✓ fyp_db_backup.sql - Database backup"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. cd fyp_system"
echo "  2. git status"
echo "  3. git pull origin main"
echo "  4. Continue with debugging"
echo ""
