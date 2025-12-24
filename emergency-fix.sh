#!/bin/bash

# Emergency Fix Script for EC2
# Fixes missing column error and frontend issues

echo "=========================================="
echo "EMERGENCY FIX - Backend & Frontend"
echo "=========================================="
echo ""

# Step 1: Get backend error details
echo "=== Step 1: Identifying Backend Error ==="
pm2 logs backend --lines 100 --nostream | grep -A 3 "column.*does not exist" | head -20
echo ""

# Step 2: Check database schema
echo "=== Step 2: Checking Database Schema ==="
PGPASSWORD="${DB_PASSWORD:-password}" psql -h "${DB_HOST:-localhost}" -U "${DB_USERNAME:-postgres}" -d "${DB_NAME:-fyp_db}" -c "\d purchase_requests" 2>&1 | head -30
echo ""

# Step 3: Apply database fix
echo "=== Step 3: Applying Database Schema Fix ==="
cd ~/fyp_system/backend

# Check if FINAL_FIX.sql exists and apply it
if [ -f "FINAL_FIX.sql" ]; then
    echo "Found FINAL_FIX.sql, applying..."
    PGPASSWORD="${DB_PASSWORD:-password}" psql -h "${DB_HOST:-localhost}" -U "${DB_USERNAME:-postgres}" -d "${DB_NAME:-fyp_db}" -f FINAL_FIX.sql
    echo "Database fix applied"
else
    echo "FINAL_FIX.sql not found, creating comprehensive fix..."
    
    # Create a comprehensive database fix
    cat > /tmp/emergency_db_fix.sql << 'SQLEOF'
-- Emergency Database Fix
-- Ensures all required columns exist

-- Fix purchase_requests table
DO $$ 
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='purchase_requests' AND column_name='requestedby') THEN
        ALTER TABLE purchase_requests ADD COLUMN requestedBy VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='purchase_requests' AND column_name='department') THEN
        ALTER TABLE purchase_requests ADD COLUMN department VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='purchase_requests' AND column_name='status') THEN
        ALTER TABLE purchase_requests ADD COLUMN status VARCHAR(50) DEFAULT 'Pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='purchase_requests' AND column_name='items') THEN
        ALTER TABLE purchase_requests ADD COLUMN items JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='purchase_requests' AND column_name='totalamount') THEN
        ALTER TABLE purchase_requests ADD COLUMN totalAmount DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='purchase_requests' AND column_name='approvedby') THEN
        ALTER TABLE purchase_requests ADD COLUMN approvedBy VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='purchase_requests' AND column_name='approvedat') THEN
        ALTER TABLE purchase_requests ADD COLUMN approvedAt TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='purchase_requests' AND column_name='created_at') THEN
        ALTER TABLE purchase_requests ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='purchase_requests' AND column_name='updated_at') THEN
        ALTER TABLE purchase_requests ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Show final schema
\d purchase_requests
SQLEOF

    # Apply the emergency fix
    PGPASSWORD="${DB_PASSWORD:-password}" psql -h "${DB_HOST:-localhost}" -U "${DB_USERNAME:-postgres}" -d "${DB_NAME:-fyp_db}" -f /tmp/emergency_db_fix.sql
fi

echo ""

# Step 4: Restart backend
echo "=== Step 4: Restarting Backend ==="
pm2 restart backend
sleep 3

# Step 5: Check backend status
echo "=== Step 5: Checking Backend Status ==="
pm2 logs backend --lines 20 --nostream | tail -15
echo ""

# Step 6: Fix frontend
echo "=== Step 6: Fixing Frontend ==="
cd ~/fyp_system/frontend

# Check if .next exists
if [ ! -d ".next" ]; then
    echo "Frontend not built, building now..."
    npm run build
fi

# Restart frontend
pm2 restart frontend
sleep 3

# Step 7: Check frontend status
echo "=== Step 7: Checking Frontend Status ==="
pm2 logs frontend --lines 20 --nostream | tail -15
echo ""

# Step 8: Final status
echo "=== Step 8: Final PM2 Status ==="
pm2 status

echo ""
echo "=========================================="
echo "FIX COMPLETE"
echo "=========================================="
echo ""
echo "Check the status above:"
echo "- Backend should be 'online' with no errors"
echo "- Frontend should be 'online' with no errors"
echo ""
echo "If still failing, run:"
echo "  pm2 logs backend"
echo "  pm2 logs frontend"
