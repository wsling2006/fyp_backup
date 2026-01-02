#!/bin/bash

# HR Upload Enum Fix - Database Migration Script
# Fixes the enum mismatch that causes upload failures

echo "================================================================"
echo "HR Document Upload Enum Migration"
echo "================================================================"
echo ""

echo "This script adds missing document types to PostgreSQL enum:"
echo "  - EMPLOYMENT_AGREEMENT"
echo "  - CERTIFICATION"
echo "  - PERFORMANCE_REVIEW"
echo ""

# Try different PostgreSQL connection methods
echo "Attempting to connect to PostgreSQL..."
echo ""

# Method 1: Try as current user (ubuntu)
if sudo -u ubuntu psql -d fyp_system -c "SELECT 1;" 2>/dev/null; then
    echo "✅ Connected as ubuntu user"
    echo ""
    echo "Running migration..."
    sudo -u ubuntu psql -d fyp_system << 'EOF'
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'EMPLOYMENT_AGREEMENT';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'CERTIFICATION';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'PERFORMANCE_REVIEW';
EOF
    
elif sudo -u postgres psql -d fyp_system -c "SELECT 1;" 2>/dev/null; then
    # Method 2: Try as postgres user with sudo
    echo "✅ Connected as postgres user"
    echo ""
    echo "Running migration..."
    sudo -u postgres psql -d fyp_system << 'EOF'
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'EMPLOYMENT_AGREEMENT';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'CERTIFICATION';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'PERFORMANCE_REVIEW';
EOF

elif psql -h localhost -U postgres -d fyp_system -c "SELECT 1;" 2>/dev/null; then
    # Method 3: Try with host localhost
    echo "✅ Connected via localhost"
    echo ""
    echo "Running migration..."
    psql -h localhost -U postgres -d fyp_system << 'EOF'
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'EMPLOYMENT_AGREEMENT';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'CERTIFICATION';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'PERFORMANCE_REVIEW';
EOF

else
    echo "❌ Could not connect to PostgreSQL"
    echo ""
    echo "Please run migration manually with one of these commands:"
    echo ""
    echo "Option 1 (as ubuntu user):"
    echo "  sudo -u ubuntu psql -d fyp_system -f backend/migrations/add_document_types_to_enum.sql"
    echo ""
    echo "Option 2 (as postgres user):"
    echo "  sudo -u postgres psql -d fyp_system -f backend/migrations/add_document_types_to_enum.sql"
    echo ""
    echo "Option 3 (with password):"
    echo "  psql -h localhost -U your_db_user -d fyp_system -f backend/migrations/add_document_types_to_enum.sql"
    echo ""
    exit 1
fi

# Check if migration succeeded
echo ""
echo "Verifying migration..."
echo ""

if sudo -u ubuntu psql -d fyp_system -c "SELECT unnest(enum_range(NULL::employee_documents_document_type_enum));" 2>/dev/null | grep -q "CERTIFICATION"; then
    echo "✅ Migration successful!"
    echo ""
    echo "Current enum values:"
    sudo -u ubuntu psql -d fyp_system -c "SELECT unnest(enum_range(NULL::employee_documents_document_type_enum));"
elif sudo -u postgres psql -d fyp_system -c "SELECT unnest(enum_range(NULL::employee_documents_document_type_enum));" 2>/dev/null | grep -q "CERTIFICATION"; then
    echo "✅ Migration successful!"
    echo ""
    echo "Current enum values:"
    sudo -u postgres psql -d fyp_system -c "SELECT unnest(enum_range(NULL::employee_documents_document_type_enum));"
else
    echo "⚠️  Could not verify migration. Please check manually:"
    echo "  sudo -u postgres psql -d fyp_system -c \"SELECT unnest(enum_range(NULL::employee_documents_document_type_enum));\""
fi

echo ""
echo "================================================================"
echo "Next steps:"
echo "1. Rebuild backend: cd backend && npm run build"
echo "2. Restart backend: pm2 restart backend"
echo "3. Test upload with CERTIFICATION document type"
echo "================================================================"
