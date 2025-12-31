#!/bin/bash

# Quick check - what's the actual error?
echo "============================================"
echo "BACKEND ERROR CHECK"
echo "============================================"
echo ""

echo "1. Last 30 lines of backend logs:"
echo "=================================="
pm2 logs backend --lines 30 --nostream

echo ""
echo ""

echo "2. Checking if dist/src/main.js exists:"
echo "========================================"
if [ -f ~/fyp_system/backend/dist/src/main.js ]; then
    echo "✓ File exists"
    ls -lh ~/fyp_system/backend/dist/src/main.js
else
    echo "✗ File does not exist!"
    echo "Build may have failed."
fi

echo ""
echo ""

echo "3. Try running backend directly:"
echo "================================="
cd ~/fyp_system/backend
echo "Command: node dist/src/main.js"
timeout 3s node dist/src/main.js 2>&1 || true

echo ""
echo ""

echo "4. Check database connection:"
echo "=============================="
node << 'NODESCRIPT'
const { Client } = require('pg');
require('dotenv').config();

async function test() {
  console.log('Testing with credentials:');
  console.log('  Host:', process.env.DB_HOST || 'localhost');
  console.log('  Port:', process.env.DB_PORT || 5432);
  console.log('  User:', process.env.DB_USERNAME || process.env.DB_USER);
  console.log('  Database:', process.env.DB_NAME || 'fyp_db');
  
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'fyp_db',
  });

  try {
    await client.connect();
    console.log('\n✓ Database connection works!');
    await client.end();
  } catch (err) {
    console.log('\n✗ Database connection failed:', err.message);
  }
}

test();
NODESCRIPT

echo ""
echo ""

echo "5. Check environment variables PM2 is using:"
echo "============================================="
pm2 show backend | grep -A 30 "env:"
