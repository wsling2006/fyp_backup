#!/bin/bash

# Diagnose Backend Error on EC2
# This script identifies the missing column error

echo "=== Getting Full Backend Error Details ==="
pm2 logs backend --lines 100 --nostream | grep -B 10 "column\|42703\|ERROR"

echo ""
echo "=== Checking Database Schema ==="
PGPASSWORD="${DB_PASSWORD:-password}" psql -h "${DB_HOST:-localhost}" -U "${DB_USERNAME:-postgres}" -d "${DB_NAME:-fyp_db}" << 'EOF'
-- List all tables
\dt

-- Describe purchase_requests table
\d purchase_requests

-- Describe claims table
\d claims

-- Describe users table
\d users

-- Describe employees table
\d employees
EOF

echo ""
echo "=== Frontend Error Details ==="
pm2 logs frontend --lines 50 --nostream | tail -30

echo ""
echo "=== PM2 Full Status ==="
pm2 status
