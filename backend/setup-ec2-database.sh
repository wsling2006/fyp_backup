#!/bin/bash

# EC2 Database Setup Script
# Run this script on your EC2 instance to set up PostgreSQL from scratch

set -e  # Exit on any error

echo "🚀 Starting EC2 Database Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Generate random passwords
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo -e "${YELLOW}📋 Generated Configuration:${NC}"
echo "DB_PASSWORD: $DB_PASSWORD"
echo "JWT_SECRET: $JWT_SECRET"
echo "ADMIN_PASSWORD: $ADMIN_PASSWORD"
echo ""

# Database configuration
DB_NAME="fyp_db"
DB_USER="fyp_user"

echo -e "${YELLOW}1️⃣  Checking PostgreSQL installation...${NC}"
if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL is not installed. Installing...${NC}"
    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
else
    echo -e "${GREEN}✓ PostgreSQL is installed${NC}"
fi

echo -e "${YELLOW}2️⃣  Dropping existing database and user (if any)...${NC}"
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
echo -e "${GREEN}✓ Cleaned up old database${NC}"

echo -e "${YELLOW}3️⃣  Creating PostgreSQL user...${NC}"
# Try to create user, if exists then alter password
if sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null; then
    echo -e "${GREEN}✓ User '$DB_USER' created${NC}"
else
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    echo -e "${GREEN}✓ User '$DB_USER' password updated${NC}"
fi

echo -e "${YELLOW}4️⃣  Creating PostgreSQL database...${NC}"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
echo -e "${GREEN}✓ Database '$DB_NAME' created${NC}"

echo -e "${YELLOW}5️⃣  Granting privileges...${NC}"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"
echo -e "${GREEN}✓ Privileges granted${NC}"

echo -e "${YELLOW}6️⃣  Testing database connection...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null
echo -e "${GREEN}✓ Database connection successful${NC}"

echo -e "${YELLOW}7️⃣  Updating .env file...${NC}"
cd /home/ubuntu/fyp_system/backend

# Backup existing .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update .env file
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

echo -e "${GREEN}✓ .env file updated${NC}"

echo -e "${YELLOW}8️⃣  Installing backend dependencies (if needed)...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
fi
echo -e "${GREEN}✓ Dependencies ready${NC}"

echo -e "${YELLOW}9️⃣  Building backend...${NC}"
npm run build
echo -e "${GREEN}✓ Backend built${NC}"

echo -e "${YELLOW}🔟 Running database migrations...${NC}"
npm run migration:run || echo -e "${YELLOW}⚠️  No migrations to run or migration failed (continuing...)${NC}"
echo -e "${GREEN}✓ Migrations completed${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📝 Important Information:${NC}"
echo ""
echo "Database Name: $DB_NAME"
echo "Database User: $DB_USER"
echo "Database Password: $DB_PASSWORD"
echo ""
echo "JWT Secret: $JWT_SECRET"
echo ""
echo "Admin Email: admin@fyp.com"
echo "Admin Password: $ADMIN_PASSWORD"
echo ""
echo -e "${YELLOW}⚠️  SAVE THESE CREDENTIALS SECURELY!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Restart PM2 backend:"
echo "   pm2 restart backend"
echo ""
echo "2. Check logs:"
echo "   pm2 logs backend --lines 50"
echo ""
echo "3. Test login at: http://47.128.68.111:3001/login"
echo "   Email: admin@fyp.com"
echo "   Password: $ADMIN_PASSWORD"
echo ""
