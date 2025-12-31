#!/bin/bash

# Quick test - connect to database as postgres user (bypasses password)
echo "============================================"
echo "DIRECT DATABASE CHECK"
echo "============================================"
echo ""

echo "Connecting to database as postgres user..."
echo ""

sudo -u postgres psql -d fyp_db << 'EOF'
-- Show current database
SELECT current_database() as database, current_user as user;

-- Check accountant files
SELECT 
    COUNT(*) as total_files,
    COUNT(CASE WHEN LENGTH(data) > 0 THEN 1 END) as files_with_data,
    COUNT(CASE WHEN LENGTH(data) = 0 OR data IS NULL THEN 1 END) as empty_files
FROM accountant_files;

-- Show recent accountant files with data status
SELECT 
    filename,
    size as metadata_size,
    LENGTH(data) as actual_data_size,
    CASE 
        WHEN data IS NULL THEN 'NULL'
        WHEN LENGTH(data) = 0 THEN 'EMPTY'
        WHEN LENGTH(data) < size THEN 'PARTIAL'
        WHEN LENGTH(data) = size THEN 'OK'
        ELSE 'MISMATCH'
    END as status,
    created_at
FROM accountant_files
ORDER BY created_at DESC
LIMIT 10;

-- Check if claims table has the new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'claims' 
AND column_name IN ('receipt_file_data', 'receipt_file_size', 'receipt_file_mimetype')
ORDER BY column_name;

EOF

echo ""
echo "============================================"
echo "ANALYSIS"
echo "============================================"
echo ""
echo "Look at the results above:"
echo ""
echo "1. If 'files_with_data' = 0:"
echo "   → Files are NOT being saved to database!"
echo ""
echo "2. If 'empty_files' > 0:"
echo "   → Some files exist but have no data!"
echo ""
echo "3. Check the 'status' column:"
echo "   • OK = File stored correctly"
echo "   • EMPTY = File has no data"
echo "   • PARTIAL = Data truncated"
echo "   • MISMATCH = Size doesn't match"
echo ""
echo "4. Check if new claim columns exist:"
echo "   • If yes = Migration ran successfully"
echo "   • If no = Migration hasn't run yet"
