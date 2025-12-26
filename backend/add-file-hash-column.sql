-- Migration: Add file_hash column to claims table
-- Purpose: Enable duplicate file detection for receipt uploads
-- Date: 2025-01-15

-- Check if column exists first, then add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' AND column_name = 'file_hash'
    ) THEN
        -- Add file_hash column
        ALTER TABLE claims ADD COLUMN file_hash VARCHAR(64) NULL;
        
        -- Add comment
        COMMENT ON COLUMN claims.file_hash IS 'SHA-256 hash of the receipt file for duplicate detection';
        
        -- Create index for fast duplicate lookups
        CREATE INDEX idx_claims_file_hash ON claims(file_hash) WHERE file_hash IS NOT NULL;
        
        RAISE NOTICE 'Successfully added file_hash column and index to claims table';
    ELSE
        RAISE NOTICE 'Column file_hash already exists in claims table, skipping migration';
    END IF;
END $$;
