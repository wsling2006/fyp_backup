-- Fix purchase_requests table schema
-- Run this on your PostgreSQL database

\c fyp_system;

-- Check current structure
\d purchase_requests;

-- Add missing columns if they don't exist
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS department VARCHAR(50);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS priority INT DEFAULT 1;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS estimated_amount DECIMAL(12,2);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS approved_amount DECIMAL(12,2);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'DRAFT';
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS reviewed_by_user_id UUID;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Verify the structure
\d purchase_requests;

-- Show any existing data
SELECT COUNT(*) FROM purchase_requests;
