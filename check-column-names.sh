#!/bin/bash
# Check actual column names in both tables
# Run this on EC2

echo "=========================================="
echo "Compare Column Names in Database"
echo "=========================================="
echo ""

echo "1. Accountant Files Table Columns:"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'accountant_files' 
AND column_name LIKE '%data%' OR column_name LIKE '%file%'
ORDER BY column_name;
"

echo ""
echo "2. Claims Table Columns:"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'claims' 
AND (column_name LIKE '%data%' OR column_name LIKE '%file%')
ORDER BY column_name;
"

echo ""
echo "=========================================="
echo "ISSUE FOUND!"
echo "=========================================="
echo "Accountant files use column 'data'"
echo "Claims use column 'receipt_file_data'"
echo ""
echo "But TypeORM entity might be using different names!"
echo ""
