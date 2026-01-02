-- Migration to add missing document types to employee_documents enum
-- Date: 2026-01-02
-- Issue: Frontend allows CERTIFICATION, EMPLOYMENT_AGREEMENT, PERFORMANCE_REVIEW
--        but database enum only has RESUME, EMPLOYMENT_CONTRACT, OFFER_LETTER, IDENTITY_DOCUMENT, OTHER

-- Step 1: Add new values to the enum type
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'EMPLOYMENT_AGREEMENT';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'CERTIFICATION';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'PERFORMANCE_REVIEW';

-- Verify the enum now has all values:
-- RESUME
-- EMPLOYMENT_AGREEMENT (NEW)
-- EMPLOYMENT_CONTRACT
-- OFFER_LETTER
-- IDENTITY_DOCUMENT
-- CERTIFICATION (NEW)
-- PERFORMANCE_REVIEW (NEW)
-- OTHER

-- Note: PostgreSQL does not allow removing enum values or reordering them.
-- The enum will now contain all document types in the order they were added.
-- This is safe and backwards compatible.
