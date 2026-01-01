-- Check current status column type
SELECT 
    column_name,
    data_type,
    udt_name,
    column_default
FROM information_schema.columns
WHERE table_name = 'purchase_requests'
AND column_name = 'status';

-- Check all existing status values
SELECT DISTINCT status 
FROM purchase_requests 
ORDER BY status;

-- Check table structure
\d purchase_requests
