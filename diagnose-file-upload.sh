#!/bin/bash
# Diagnose File Upload Issue - Check if files are in database
# Run this on EC2

echo "=========================================="
echo "File Upload Diagnosis"
echo "=========================================="
echo ""

echo "1. Checking claims table columns..."
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'claims' 
    AND column_name LIKE '%receipt%'
ORDER BY column_name;
"

echo ""
echo "2. Checking if any claims exist..."
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT COUNT(*) as total_claims FROM claims;
"

echo ""
echo "3. Checking file data in claims (checking if BYTEA columns have data)..."
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT 
    id,
    receipt_file_original_name,
    CASE 
        WHEN receipt_file_data IS NULL THEN 'NULL (EMPTY)'
        ELSE 'HAS DATA (' || length(receipt_file_data) || ' bytes)'
    END as file_data_status,
    receipt_file_size,
    receipt_file_mimetype,
    status,
    uploaded_at
FROM claims 
ORDER BY uploaded_at DESC 
LIMIT 5;
"

echo ""
echo "4. Checking accountant_files table for comparison..."
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT 
    id,
    original_filename,
    CASE 
        WHEN file_data IS NULL THEN 'NULL (EMPTY)'
        ELSE 'HAS DATA (' || length(file_data) || ' bytes)'
    END as file_data_status,
    file_size,
    mimetype,
    uploaded_at
FROM accountant_files 
ORDER BY uploaded_at DESC 
LIMIT 3;
"

echo ""
echo "5. Checking backend logs for upload errors..."
pm2 logs backend --lines 100 --nostream | grep -i "upload\|claim\|file\|bytea\|error" | tail -30

echo ""
echo "=========================================="
echo "Diagnosis Summary"
echo "=========================================="
echo ""
echo "Check the output above for:"
echo "1. Are receipt_file_data, receipt_file_size, receipt_file_mimetype columns present?"
echo "2. Do claims exist in the database?"
echo "3. Does receipt_file_data show 'HAS DATA' or 'NULL (EMPTY)'?"
echo "4. Compare with accountant_files - do those have data?"
echo "5. Are there any errors in backend logs during upload?"
echo ""
