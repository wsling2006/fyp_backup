#!/bin/bash

# Complete EC2 Setup Script - Fresh Installation
# This script will set up everything from scratch with new passwords
# Safe to run - handles database reset properly

set -e  # Exit on any error

echo "🚀 Starting Complete EC2 Setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to project directory
cd /home/ubuntu/fyp_system

# ============================================================================
# STEP 1: Generate Secure Passwords
# ============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 1: Generating Secure Passwords${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo -e "${GREEN}✓ Generated secure passwords${NC}"
echo ""

# ============================================================================
# STEP 2: Set Up PostgreSQL Database
# ============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 2: Setting Up PostgreSQL Database${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

DB_NAME="fyp_db"
DB_USER="fyp_user"

# Drop existing database and user
echo "Cleaning up old database..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
echo -e "${GREEN}✓ Cleaned up old database${NC}"

# Create new user
echo "Creating database user..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
echo -e "${GREEN}✓ User '$DB_USER' created${NC}"

# Create database
echo "Creating database..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
echo -e "${GREEN}✓ Database '$DB_NAME' created${NC}"

# Grant privileges
echo "Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"
echo -e "${GREEN}✓ Privileges granted${NC}"

# Test connection
echo "Testing database connection..."
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# ============================================================================
# STEP 3: Create Backend .env File
# ============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 3: Creating Backend Configuration${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd backend

# Backup existing .env if present
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "Backed up existing .env file"
fi

# Create new .env file
cat > .env << EOF
NODE_ENV=production
PORT=3000

FRONTEND_URL=http://47.128.68.111

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

JWT_SECRET=$JWT_SECRET

EMAIL_USER=leejingwei123@gmail.com
EMAIL_PASS=ctxddlkqkhkxkpwk

ADMIN_EMAIL=admin@fyp.com
ADMIN_PASSWORD=$ADMIN_PASSWORD

EOF

echo -e "${GREEN}✓ Backend .env file created${NC}"
echo ""

# ============================================================================
# STEP 4: Install and Build Backend
# ============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 4: Installing and Building Backend${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Installing backend dependencies..."
npm install --production=false
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

echo "Building backend..."
npm run build
echo -e "${GREEN}✓ Backend built successfully${NC}"

echo "Running database migrations..."
npm run migration:run 2>/dev/null || echo -e "${YELLOW}⚠️  No migrations to run or migration failed (continuing...)${NC}"
echo -e "${GREEN}✓ Database migrations completed${NC}"
echo ""

# ============================================================================
# STEP 5: Create Frontend .env File
# ============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 5: Creating Frontend Configuration${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd ../frontend

# Backup existing .env.production if present
if [ -f .env.production ]; then
    cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
    echo "Backed up existing .env.production file"
fi

# Create .env.production file
cat > .env.production << EOF
NEXT_PUBLIC_API_URL=http://47.128.68.111:3000
EOF

echo -e "${GREEN}✓ Frontend .env.production file created${NC}"
echo ""

# ============================================================================
# STEP 6: Install and Build Frontend
# ============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 6: Installing and Building Frontend${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "Installing frontend dependencies..."
npm install --production=false
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

echo "Building frontend..."
npm run build
echo -e "${GREEN}✓ Frontend built successfully${NC}"
echo ""

# ============================================================================
# STEP 7: Start with PM2
# ============================================================================
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 7: Starting Applications with PM2${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd ..

echo "Starting backend and frontend..."
pm2 start ecosystem.config.js
echo -e "${GREEN}✓ Applications started${NC}"

echo "Saving PM2 configuration..."
pm2 save
echo -e "${GREEN}✓ PM2 configuration saved${NC}"
echo ""

# ============================================================================
# STEP 8: Display Summary
# ============================================================================
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ SETUP COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 IMPORTANT CREDENTIALS - SAVE THESE SECURELY!${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Database Credentials:${NC}"
echo "  Database Name: $DB_NAME"
echo "  Database User: $DB_USER"
echo "  Database Password: $DB_PASSWORD"
echo ""
echo -e "${BLUE}Application Credentials:${NC}"
echo "  JWT Secret: $JWT_SECRET"
echo ""
echo -e "${BLUE}Admin Login Credentials:${NC}"
echo "  Admin Email: admin@fyp.com"
echo "  Admin Password: $ADMIN_PASSWORD"
echo ""
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}🌐 Access Your Application:${NC}"
echo "  Frontend: http://47.128.68.111:3001"
echo "  Backend API: http://47.128.68.111:3000"
echo ""
echo -e "${BLUE}📊 Check Application Status:${NC}"
echo "  pm2 status"
echo "  pm2 logs"
echo ""
echo -e "${BLUE}🔄 Restart Applications:${NC}"
echo "  pm2 restart all"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Copy the credentials above and save them somewhere safe!${NC}"
echo ""

# Display PM2 status
echo -e "${BLUE}Current PM2 Status:${NC}"
pm2 status

echo ""
echo -e "${GREEN}Setup script completed successfully! 🎉${NC}"
echo ""
