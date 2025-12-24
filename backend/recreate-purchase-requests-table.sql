-- OPTION 2: Drop and recreate table (loses all data!)
-- Only use if table is empty or you don't need the data

\c fyp_db;

-- Check data first
SELECT COUNT(*) FROM purchase_requests;

-- Uncomment below ONLY if you're sure you want to delete all data:
-- DROP TABLE IF EXISTS claims CASCADE;
-- DROP TABLE IF EXISTS purchase_requests CASCADE;

-- Create new table with correct schema
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    department VARCHAR(50) NOT NULL,
    priority INT DEFAULT 1,
    estimated_amount DECIMAL(12,2) NOT NULL,
    approved_amount DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_by_user_id UUID NOT NULL,
    reviewed_by_user_id UUID,
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Verify
\d purchase_requests;
