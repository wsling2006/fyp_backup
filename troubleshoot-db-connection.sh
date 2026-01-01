#!/bin/bash

# ============================================
# Database Connection Troubleshooting Script
# ============================================

echo "🔍 Checking Database Connection..."
echo ""

# Check if DATABASE_URL is set
echo "1️⃣ Checking DATABASE_URL environment variable:"
if [ -z "$DATABASE_URL" ]; then
    echo "   ❌ DATABASE_URL is not set"
    echo ""
    echo "   Let's check your backend .env file:"
    if [ -f ~/fyp_system/backend/.env ]; then
        echo "   Found backend/.env file"
        echo "   DATABASE_URL value:"
        grep "DATABASE_URL" ~/fyp_system/backend/.env | head -1
    else
        echo "   ❌ backend/.env file not found"
    fi
else
    echo "   ✅ DATABASE_URL is set"
    echo "   Value: $DATABASE_URL"
fi

echo ""
echo "2️⃣ Checking PostgreSQL service:"
sudo systemctl status postgresql | grep "Active:" || echo "   ℹ️ PostgreSQL might not be running as a service"

echo ""
echo "3️⃣ Checking PostgreSQL processes:"
ps aux | grep postgres | grep -v grep || echo "   ⚠️ No PostgreSQL processes found"

echo ""
echo "4️⃣ Checking PostgreSQL socket:"
ls -la /var/run/postgresql/.s.PGSQL.* 2>/dev/null || echo "   ⚠️ No PostgreSQL socket found"

echo ""
echo "5️⃣ Available PostgreSQL users (roles):"
sudo -u postgres psql -c "\du" 2>/dev/null || echo "   ℹ️ Cannot list users (might need different permissions)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 SOLUTIONS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Option A: Export DATABASE_URL from backend/.env"
echo "   cd ~/fyp_system/backend"
echo "   export \$(cat .env | grep DATABASE_URL | xargs)"
echo "   psql \$DATABASE_URL < ../database-migration-partially-paid.sql"
echo ""
echo "Option B: Connect directly as postgres superuser"
echo "   sudo -u postgres psql fyp_system_db < database-migration-partially-paid.sql"
echo ""
echo "Option C: Use connection parameters from .env"
echo "   # Extract from backend/.env and connect manually"
echo "   psql -h localhost -U your_db_user -d your_db_name -f database-migration-partially-paid.sql"
echo ""
