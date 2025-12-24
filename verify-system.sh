#!/bin/bash

# Final System Verification Script
# Run this on EC2 after deploying the backend fix

echo "=========================================="
echo "FINAL SYSTEM VERIFICATION"
echo "=========================================="
echo ""

# Check PM2 Status
echo "=== PM2 Process Status ==="
pm2 status
echo ""

# Check Backend Logs
echo "=== Backend Logs (last 30 lines) ==="
pm2 logs backend --lines 30 --nostream
echo ""

# Check Frontend Logs
echo "=== Frontend Logs (last 30 lines) ==="
pm2 logs frontend --lines 30 --nostream
echo ""

# Test Backend Health
echo "=== Testing Backend Health Endpoint ==="
curl -s http://localhost:3000 || echo "Backend health check failed"
echo ""

# Test Frontend Access
echo "=== Testing Frontend Access ==="
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3001
echo ""

# Check Database Connection
echo "=== Testing Database Connection ==="
cd ~/fyp_system/backend
node -e "
const { DataSource } = require('typeorm');
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'fyp_db',
});
AppDataSource.initialize()
  .then(() => { console.log('✓ Database connection successful'); AppDataSource.destroy(); })
  .catch((err) => { console.error('✗ Database connection failed:', err.message); process.exit(1); });
" 2>&1
echo ""

# Check Purchase Requests Table Schema
echo "=== Checking Purchase Requests Table Schema ==="
PGPASSWORD="${DB_PASSWORD:-password}" psql -h "${DB_HOST:-localhost}" -U "${DB_USERNAME:-postgres}" -d "${DB_NAME:-fyp_db}" -c "\d purchase_requests" 2>&1
echo ""

# Check Claims Table Schema
echo "=== Checking Claims Table Schema ==="
PGPASSWORD="${DB_PASSWORD:-password}" psql -h "${DB_HOST:-localhost}" -U "${DB_USERNAME:-postgres}" -d "${DB_NAME:-fyp_db}" -c "\d claims" 2>&1
echo ""

# Test Authentication Endpoint
echo "=== Testing Auth Endpoint ==="
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' | head -c 200
echo ""
echo ""

echo "=========================================="
echo "VERIFICATION COMPLETE"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. If backend/frontend are running: Test login at your public URL"
echo "2. Login as sales_department user"
echo "3. Try to create and view purchase requests"
echo "4. If any issues, check logs with: pm2 logs backend or pm2 logs frontend"
echo ""
