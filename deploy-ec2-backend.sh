#!/bin/bash
# EC2 Deployment Script - Apply all fixes to production
# Run this script on your EC2 server after pulling the latest code

set -e  # Exit on error

echo "=========================================="
echo "EC2 Backend Deployment & Fix Script"
echo "=========================================="
echo ""

# Navigate to backend directory
cd ~/fyp_system/backend || exit 1

echo "1. Creating .env file..."
if [ ! -f .env ]; then
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000

# Frontend URL for CORS (Next.js server address)
FRONTEND_URL=http://localhost:3001

# Database configuration (UPDATE THESE VALUES)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=ubuntu
DB_PASSWORD=YourPasswordHere
DB_NAME=fyp_db

# JWT Secret (CHANGE THIS TO A SECURE RANDOM STRING)
# Generate with: openssl rand -base64 32
JWT_SECRET=your-secure-jwt-secret-change-this-in-production

# Email configuration (optional)
EMAIL_USER=
EMAIL_PASS=

# Admin account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeThisPassword123
EOF
    echo "✓ .env file created (PLEASE UPDATE THE VALUES!)"
    echo "⚠️  IMPORTANT: Edit .env and set correct DB_PASSWORD and JWT_SECRET"
    echo ""
    echo "Backend will bind to 0.0.0.0:3000 (accessible to Next.js)"
else
    echo "✓ .env file already exists"
    echo "Checking NODE_ENV setting..."
    if grep -q "NODE_ENV=production" .env; then
        echo "✓ NODE_ENV is set to production (backend will bind to 0.0.0.0)"
    else
        echo "⚠️  Warning: NODE_ENV not set to production"
        echo "   Backend will bind to 127.0.0.1 instead of 0.0.0.0"
        echo "   This may prevent Next.js from connecting"
    fi
fi

echo ""
echo "2. Installing dependencies..."
npm install

echo ""
echo "3. Building backend..."
npm run build

echo ""
echo "4. Checking database connection..."
# Test database connection
if psql -U ubuntu -d fyp_db -c "SELECT version();" > /dev/null 2>&1; then
    echo "✓ Database connection successful"
else
    echo "⚠️  Cannot connect to database. Please check:"
    echo "   - PostgreSQL is running: sudo systemctl status postgresql"
    echo "   - Database 'fyp_db' exists"
    echo "   - User 'ubuntu' has access"
    echo ""
    echo "To create database and user, run:"
    echo "  sudo -u postgres psql -c \"CREATE DATABASE fyp_db;\""
    echo "  sudo -u postgres psql -c \"CREATE USER ubuntu WITH PASSWORD 'your_password';\""
    echo "  sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE fyp_db TO ubuntu;\""
    exit 1
fi

echo ""
echo "5. Running migrations..."
npm run migration:run || echo "⚠️  Migrations had warnings (may be normal)"

echo ""
echo "6. Adding missing columns to users table..."
psql -U ubuntu -d fyp_db << 'EOSQL'
-- Add missing columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_reset_expires_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked_until timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_id uuid;
EOSQL
echo "✓ User table columns updated"

echo ""
echo "7. Adding role enum values..."
psql -U ubuntu -d fyp_db << 'EOSQL'
-- Add all role enum values (ignoring duplicates)
ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'human_resources';
ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'sales_department';

-- Display current enum values
SELECT unnest(enum_range(NULL::users_role_enum)) as role ORDER BY role;
EOSQL
echo "✓ Role enum values added"

echo ""
echo "8. Killing any existing backend processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

echo ""
echo "9. Starting backend with PM2..."
pm2 stop backend 2>/dev/null || true
pm2 delete backend 2>/dev/null || true
cd ~/fyp_system
pm2 start ecosystem.config.js
sleep 3
pm2 list

echo ""
echo "10. Verifying backend is running..."
if lsof -ti:3000 > /dev/null; then
    echo "✓ Backend is running on port 3000!"
    curl -s http://localhost:3000/auth/login -X POST -H "Content-Type: application/json" \
         -d '{"email":"test","password":"test"}' | head -1
    echo ""
else
    echo "✗ Backend is not running!"
    echo "Check PM2 logs: pm2 logs backend"
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ Deployment Complete!"
echo "=========================================="
echo ""
echo "Useful commands:"
echo "  pm2 list                  - Show all PM2 processes"
echo "  pm2 logs backend          - View backend logs"
echo "  pm2 restart backend       - Restart backend"
echo "  pm2 stop backend          - Stop backend"
echo ""
echo "Backend API: http://localhost:3000"
echo "Frontend: http://localhost:3001"
echo ""
echo "Default admin login:"
echo "  Email: admin@example.com"
echo "  Password: (check .env file)"
echo ""
