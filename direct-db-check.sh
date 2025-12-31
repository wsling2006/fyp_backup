#!/bin/bash
# Direct check of what's in the database
# Run this on EC2

echo "=========================================="
echo "Direct Database Check"
echo "=========================================="
echo ""

echo "1. Check accountant_files table structure:"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "\d accountant_files" | head -30

echo ""
echo "2. Check if accountant files have data:"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT 
    id,
    filename as original_filename,
    CASE 
        WHEN data IS NOT NULL THEN 'HAS DATA (' || length(data) || ' bytes)'
        ELSE 'NULL (EMPTY)'
    END as file_status,
    size,
    mimetype,
    created_at
FROM accountant_files 
ORDER BY created_at DESC 
LIMIT 3;
" 2>&1

echo ""
echo "3. Check claims table structure:"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "\d claims" | grep -E "Column|receipt_file" | head -10

echo ""
echo "4. Double-check: What columns does claims table actually have?"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'claims' 
AND (column_name LIKE '%file%' OR column_name LIKE '%receipt%')
ORDER BY column_name;
"

echo ""
echo "=========================================="
