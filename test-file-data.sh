#!/bin/bash
# Test if files actually have data in the database
# Run this on EC2

echo "=========================================="
echo "File Data Test - Are files actually stored?"
echo "=========================================="
echo ""

echo "1. Count accountant files:"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT COUNT(*) as total FROM accountant_files;
"

echo ""
echo "2. Check latest 3 accountant files for actual data:"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT 
    LEFT(id::text, 8) as id_prefix,
    filename,
    size as stated_size,
    CASE 
        WHEN data IS NULL THEN 'NULL'
        WHEN length(data) = 0 THEN 'EMPTY (0 bytes)'
        ELSE 'HAS DATA (' || length(data) || ' bytes)'
    END as actual_data_status,
    mimetype,
    created_at
FROM accountant_files 
ORDER BY created_at DESC 
LIMIT 3;
"

echo ""
echo "3. Count claims:"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT COUNT(*) as total FROM claims;
"

echo ""
echo "4. Check latest 3 claims for actual data:"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT 
    LEFT(id::text, 8) as id_prefix,
    receipt_file_original_name as filename,
    receipt_file_size as stated_size,
    CASE 
        WHEN receipt_file_data IS NULL THEN 'NULL'
        WHEN length(receipt_file_data) = 0 THEN 'EMPTY (0 bytes)'
        ELSE 'HAS DATA (' || length(receipt_file_data) || ' bytes)'
    END as actual_data_status,
    receipt_file_mimetype as mimetype,
    uploaded_at
FROM claims 
ORDER BY uploaded_at DESC 
LIMIT 3;
"

echo ""
echo "=========================================="
echo "Analysis:"
echo "=========================================="
echo ""
echo "If 'actual_data_status' shows:"
echo "  - 'NULL' = Column exists but no data saved"
echo "  - 'EMPTY (0 bytes)' = Empty buffer saved"  
echo "  - 'HAS DATA (X bytes)' = File saved successfully!"
echo ""
echo "If stated_size doesn't match actual data length,"
echo "then the buffer is not being saved correctly."
echo ""
