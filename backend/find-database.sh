#!/bin/bash

# Find out what database the system is ACTUALLY using
echo "============================================"
echo "DATABASE CONNECTION DETECTIVE"
echo "============================================"
echo ""

cd ~/fyp_system/backend || exit 1

# 1. Check .env file
echo "1. Environment file (.env):"
echo "================================"
if [ -f .env ]; then
    echo "✓ .env file exists"
    echo ""
    grep -E "^DB_" .env | while read line; do
        key=$(echo "$line" | cut -d= -f1)
        value=$(echo "$line" | cut -d= -f2)
        if [[ "$key" == "DB_PASSWORD" ]]; then
            echo "  $key=${value:0:3}... (hidden)"
        else
            echo "  $line"
        fi
    done
else
    echo "✗ No .env file found"
fi

echo ""
echo ""

# 2. Check what PM2 is using
echo "2. PM2 Environment Variables:"
echo "================================"
echo "Checking what the running backend process sees..."
pm2 show fyp-backend | grep -A 20 "env:" | grep -E "DB_|PORT"

echo ""
echo ""

# 3. Check PostgreSQL is running and which databases exist
echo "3. PostgreSQL Status:"
echo "================================"
sudo systemctl status postgresql | grep -E "Active|Loaded" || echo "PostgreSQL status check failed"

echo ""
echo ""

# 4. List all PostgreSQL databases
echo "4. Available Databases:"
echo "================================"
sudo -u postgres psql -l

echo ""
echo ""

# 5. Check if we can connect with the postgres user
echo "5. Testing Connection as postgres user:"
echo "========================================"
echo "Trying to connect without password (peer authentication)..."
sudo -u postgres psql -d fyp_db -c "SELECT current_database(), current_user;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ Can connect as postgres user via sudo"
    echo ""
    echo "Now checking the actual database configuration..."
    sudo -u postgres psql -d fyp_db << 'PSQL'
-- Check if our tables exist
SELECT 
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
PSQL
else
    echo "✗ Cannot connect to database"
fi

echo ""
echo ""

# 6. Check data-source.ts file
echo "6. TypeORM Data Source Configuration:"
echo "======================================"
if [ -f src/data-source.ts ]; then
    echo "File: src/data-source.ts"
    grep -A 10 "new DataSource" src/data-source.ts | head -20
else
    echo "✗ data-source.ts not found"
fi

echo ""
echo ""

# 7. Check ecosystem.config.js for PM2 environment
echo "7. PM2 Ecosystem Configuration:"
echo "================================"
if [ -f ../ecosystem.config.js ]; then
    echo "File: ecosystem.config.js"
    grep -A 20 "env:" ../ecosystem.config.js | head -25
else
    echo "✗ ecosystem.config.js not found"
fi

echo ""
echo ""

echo "============================================"
echo "SUMMARY"
echo "============================================"
echo ""
echo "The system might be using different database credentials than .env file!"
echo ""
echo "Check the PM2 environment variables above - those are what the app uses."
echo "If PM2 env is different from .env, that's your issue!"
echo ""
echo "To fix:"
echo "1. Update ecosystem.config.js with correct DB credentials"
echo "2. Or remove DB vars from ecosystem.config.js to use .env"
echo "3. Restart: pm2 delete fyp-backend && pm2 start ecosystem.config.js"
