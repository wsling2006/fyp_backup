#!/bin/bash
# Fix Claims Table - Add BYTEA Columns for File Storage
# Run this on EC2

echo "=========================================="
echo "Adding File Storage Columns to Claims Table"
echo "=========================================="
echo ""

cd ~/fyp_system/backend

echo "1. Checking current claims table structure..."
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -U fyp_user -d fyp_db -c "\d claims"

echo ""
echo "2. Adding missing BYTEA columns to claims table..."
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -U fyp_user -d fyp_db << 'EOSQL'
-- Add file data storage columns if they don't exist
ALTER TABLE claims ADD COLUMN IF NOT EXISTS receipt_file_data bytea;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS receipt_file_size bigint;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS receipt_file_mimetype varchar(100);

-- Keep the old receipt_file_path column for backward compatibility (but it won't be used)
-- Don't drop it in case there's old data

-- Show the updated structure
\d claims
EOSQL

echo ""
echo "3. Verifying the changes..."
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -U fyp_user -d fyp_db -c "
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'claims' 
    AND column_name IN ('receipt_file_data', 'receipt_file_size', 'receipt_file_mimetype', 'receipt_file_path')
ORDER BY column_name;
"

echo ""
echo "4. Restarting backend to clear any cached schema..."
cd ~/fyp_system
pm2 restart backend

sleep 3

echo ""
echo "5. Checking backend logs..."
pm2 logs backend --lines 20 --nostream

echo ""
echo "=========================================="
echo "✓ Claims Table Fix Complete!"
echo "=========================================="
echo ""
echo "The claims table now has:"
echo "  - receipt_file_data (bytea) - Stores file content"
echo "  - receipt_file_size (bigint) - Stores file size"
echo "  - receipt_file_mimetype (varchar) - Stores MIME type"
echo ""
echo "Test the purchase request page now!"
echo ""
