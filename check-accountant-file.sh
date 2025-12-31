#!/bin/bash
# Check if the accountant file was saved correctly
# Run this on EC2

echo "=========================================="
echo "Check Latest Accountant File Upload"
echo "=========================================="
echo ""

echo "Checking most recent accountant file upload..."
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
LIMIT 1;
"

echo ""
echo "If file_data_status shows 'HAS DATA', accountant files are working!"
echo "If it shows 'NULL (EMPTY)', accountant files have the same issue."
echo ""
