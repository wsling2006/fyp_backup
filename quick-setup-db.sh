#!/bin/bash

# Quick Database Fix Script
# Run this on EC2 to create the database if it doesn't exist

echo "🔧 FYP System Database Quick Setup"
echo "===================================="
echo ""

# Try to connect to see what exists
echo "Checking existing databases..."
sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w fyp_db && echo "✅ fyp_db exists" || echo "❌ fyp_db not found"
sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w fyp_system && echo "✅ fyp_system exists" || echo "❌ fyp_system not found"
echo ""

# Check PostgreSQL status
echo "Checking PostgreSQL status..."
if sudo systemctl is-active --quiet postgresql; then
  echo "✅ PostgreSQL is running"
else
  echo "❌ PostgreSQL is not running - starting it..."
  sudo systemctl start postgresql
  if sudo systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL started successfully"
  else
    echo "❌ Failed to start PostgreSQL"
    exit 1
  fi
fi
echo ""

# Create fyp_db if it doesn't exist (this is what the code expects)
echo "Creating database fyp_db..."
sudo -u postgres psql << EOF
SELECT 'DB EXISTS' as result FROM pg_database WHERE datname='fyp_db'
\gset
EOF

if [ -z "$result" ]; then
  echo "Creating database fyp_db..."
  sudo -u postgres psql -c "CREATE DATABASE fyp_db WITH OWNER postgres;"
  echo "✅ Database fyp_db created"
else
  echo "✅ Database fyp_db already exists"
fi

echo ""
echo "Verifying connection..."
if sudo -u postgres psql -d fyp_db -c "SELECT 1" > /dev/null 2>&1; then
  echo "✅ Successfully connected to fyp_db"
else
  echo "❌ Could not connect to fyp_db"
  exit 1
fi

echo ""
echo "════════════════════════════════════════════"
echo "✅ Database setup complete!"
echo "════════════════════════════════════════════"
echo ""
echo "Next step: Run TypeORM migrations"
echo "  cd ~/fyp_system/backend"
echo "  npm install"
echo "  npm run build"
echo "  npm run typeorm -- migration:run"
echo ""
echo "Then start the application"
echo "  pm2 start ecosystem.config.js"
echo ""
