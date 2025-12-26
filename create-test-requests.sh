#!/bin/bash

# Create Test DRAFT Purchase Request for Testing Edit Button
# This script creates a DRAFT request so you can test the Edit button

echo "=================================================="
echo "Creating Test DRAFT Purchase Request"
echo "=================================================="

# Get the sales user ID
USER_ID="a11b07a6-7897-406e-bd08-8198606ae82b"
USER_EMAIL="leejwei004@gmail.com"

echo ""
echo "User: $USER_EMAIL"
echo "User ID: $USER_ID"
echo ""

# Insert a DRAFT purchase request
sudo -u postgres psql fyp_db <<EOF
-- Create a DRAFT purchase request for testing
INSERT INTO purchase_requests (
    id,
    title,
    description,
    department,
    priority,
    estimated_amount,
    approved_amount,
    status,
    created_by_user_id,
    reviewed_by_user_id,
    review_notes,
    reviewed_at,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'TEST DRAFT - Please Edit Me',
    'This is a test DRAFT request to verify the Edit button works. You should be able to edit this request.',
    'sales_department',
    2,
    500.00,
    NULL,
    'DRAFT',
    '$USER_ID',
    NULL,
    NULL,
    NULL,
    NOW(),
    NOW()
);

-- Also create a SUBMITTED request for testing
INSERT INTO purchase_requests (
    id,
    title,
    description,
    department,
    priority,
    estimated_amount,
    approved_amount,
    status,
    created_by_user_id,
    reviewed_by_user_id,
    review_notes,
    reviewed_at,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'TEST SUBMITTED - Please Edit Me',
    'This is a test SUBMITTED request to verify the Edit button works. You should be able to edit this request.',
    'sales_department',
    3,
    750.00,
    NULL,
    'SUBMITTED',
    '$USER_ID',
    NULL,
    NULL,
    NULL,
    NOW(),
    NOW()
);

-- Show the created requests
SELECT id, title, status, created_by_user_id 
FROM purchase_requests 
WHERE title LIKE 'TEST%'
ORDER BY created_at DESC;
EOF

echo ""
echo "=================================================="
echo "✅ Test requests created!"
echo "=================================================="
echo ""
echo "Now do this:"
echo "1. Clear localStorage: localStorage.clear();"
echo "2. Login again"
echo "3. Go to Purchase Requests page"
echo "4. You should see TWO test requests with Edit buttons!"
echo ""
echo "Expected behavior:"
echo "✅ TEST DRAFT - Should have Edit button"
echo "✅ TEST SUBMITTED - Should have Edit button"
echo "❌ APPROVED requests - No Edit button (correct)"
echo "❌ REJECTED requests - No Edit button (correct)"
echo "=================================================="
