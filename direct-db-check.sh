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
        WHEN file_data IS NOT NULL THEN 'HAS file_data (' || length(file_data) || ' bytes)'
        WHEN data IS NOT NULL THEN 'HAS data (' || length(data) || ' bytes)'
        ELSE 'NO DATA COLUMNS FOUND'
    END as file_status,
    size,
    mimetype,
    created_at
FROM accountant_files 
ORDER BY created_at DESC 
LIMIT 3;
" 2>&1

echo ""
echo "=========================================="
