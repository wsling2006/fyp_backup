-- OPTION 1: Rename and add columns to match entity (preserves existing data)
-- Run this if you want to keep existing purchase requests

\c fyp_db;

BEGIN;

-- Rename old columns to new names
ALTER TABLE purchase_requests RENAME COLUMN requester_id TO created_by_user_id;
ALTER TABLE purchase_requests RENAME COLUMN item_name TO title;
ALTER TABLE purchase_requests RENAME COLUMN cost TO estimated_amount;

-- Add new required columns
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS department VARCHAR(50);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS priority INT DEFAULT 1;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(12,2);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS reviewed_by_user_id UUID;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update description from quantity info if needed
UPDATE purchase_requests SET description = 'Quantity: ' || quantity WHERE description IS NULL;

-- Drop quantity column if no longer needed
-- ALTER TABLE purchase_requests DROP COLUMN IF EXISTS quantity;

-- Update status to match enum if needed
UPDATE purchase_requests SET status = 'SUBMITTED' WHERE status NOT IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID');

-- Check the updated structure
\d purchase_requests;

COMMIT;

-- Show the data
SELECT * FROM purchase_requests;
