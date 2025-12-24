-- COMPLETE DATABASE RESET - Final Fix
-- This will drop and recreate BOTH tables with correct schema matching entities

\c fyp_db;

-- Drop tables
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS purchase_requests CASCADE;

-- Create purchase_requests table
CREATE TABLE purchase_requests (
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
    CONSTRAINT fk_pr_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_pr_reviewed_by FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create claims table with CORRECT column names matching entity
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_request_id UUID NOT NULL,
    receipt_file_path VARCHAR(500) NOT NULL,
    receipt_file_original_name VARCHAR(500) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    amount_claimed DECIMAL(12,2) NOT NULL,
    purchase_date DATE NOT NULL,
    claim_description TEXT NOT NULL,
    uploaded_by_user_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    verified_by_user_id UUID,
    verification_notes TEXT,
    verified_at TIMESTAMP,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_claims_pr FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    CONSTRAINT fk_claims_uploaded_by FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_claims_verified_by FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_pr_created_by ON purchase_requests(created_by_user_id);
CREATE INDEX idx_pr_status ON purchase_requests(status);
CREATE INDEX idx_pr_department ON purchase_requests(department);
CREATE INDEX idx_claims_pr ON claims(purchase_request_id);
CREATE INDEX idx_claims_uploaded_by ON claims(uploaded_by_user_id);
CREATE INDEX idx_claims_status ON claims(status);

-- Verify
\d purchase_requests
\d claims

SELECT 'SUCCESS: Both tables recreated with correct schema!' as status;
