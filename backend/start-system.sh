#!/bin/bash

# Fix the system and start it properly
echo "============================================"
echo "FIXING AND STARTING THE SYSTEM"
echo "============================================"
echo ""

cd ~/fyp_system/backend || exit 1

# 1. Check if backend is built
echo "1. Checking if backend is built..."
if [ ! -d "dist" ]; then
    echo "✗ Backend not built. Building now..."
    npm run build
else
    echo "✓ Backend is built"
fi

echo ""

# 2. Stop any running PM2 processes
echo "2. Stopping any existing PM2 processes..."
pm2 delete all 2>/dev/null || echo "No PM2 processes to stop"

echo ""

# 3. Check database connection
echo "3. Testing database connection..."
node << 'NODESCRIPT'
const { Client } = require('pg');
require('dotenv').config();

async function test() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || process.env.DB_USER, // Try both
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'fyp_db',
  });

  try {
    await client.connect();
    console.log('✓ Database connection successful!');
    console.log('  User:', process.env.DB_USERNAME || process.env.DB_USER);
    console.log('  Database:', process.env.DB_NAME);
    
    // Quick check on files
    const result = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN LENGTH(data) > 0 THEN 1 END) as with_data
      FROM accountant_files
    `);
    
    console.log('  Accountant files:', result.rows[0].total, 'total,', result.rows[0].with_data, 'with data');
    
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  }
}

test();
NODESCRIPT

if [ $? -ne 0 ]; then
    echo ""
    echo "✗ Database connection failed. Check your .env file!"
    exit 1
fi

echo ""

# 4. Start with PM2
echo "4. Starting backend with PM2..."
cd ~/fyp_system
pm2 start ecosystem.config.js

echo ""

# 5. Wait a moment for it to start
echo "5. Waiting for backend to start..."
sleep 5

echo ""

# 6. Check status
echo "6. Checking PM2 status..."
pm2 status

echo ""

# 7. Show logs
echo "7. Recent logs:"
pm2 logs fyp-backend --lines 30 --nostream

echo ""
echo "============================================"
echo "SYSTEM STARTED"
echo "============================================"
echo ""
echo "Monitor logs with: pm2 logs fyp-backend"
echo "Stop with: pm2 stop fyp-backend"
echo "Restart with: pm2 restart fyp-backend"
echo ""
