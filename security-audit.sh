#!/bin/bash

# Security Audit Script - Role-Based Access Control Check
# Checks all pages for proper authorization

echo "=================================================="
echo "🔒 SECURITY AUDIT: Role-Based Access Control"
echo "=================================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

total_pages=0
secure_pages=0
vulnerable_pages=0
public_pages=0

# Function to check if a page has authorization
check_page_security() {
    local file=$1
    local page_name=$(echo $file | sed 's|.*/frontend/app/||' | sed 's|/page.tsx||')
    
    total_pages=$((total_pages + 1))
    
    # Check for authorization patterns
    local has_role_check=$(grep -E "user\.role.*!==|user\.role.*===|allowedRoles|Roles\(" "$file" | wc -l)
    local has_redirect=$(grep -E "router\.(push|replace).*login|router\.(push|replace).*dashboard" "$file" | wc -l)
    local has_useauth=$(grep -E "useAuth\(\)" "$file" | wc -l)
    
    # Determine if page should be public or protected
    local is_public=false
    if [[ "$page_name" =~ ^(login|verify-otp|forgot-password|reset-password|page.tsx|^$)$ ]]; then
        is_public=true
    fi
    
    echo "-------------------------------------------"
    echo -e "${BLUE}Page: /$page_name${NC}"
    
    if [ "$is_public" = true ]; then
        echo -e "${GREEN}✓ PUBLIC PAGE${NC} (No auth required)"
        public_pages=$((public_pages + 1))
    else
        if [ $has_useauth -gt 0 ]; then
            if [ $has_role_check -gt 0 ] && [ $has_redirect -gt 0 ]; then
                echo -e "${GREEN}✓ SECURE${NC} - Has role check and redirect"
                secure_pages=$((secure_pages + 1))
            elif [ $has_role_check -gt 0 ]; then
                echo -e "${YELLOW}⚠ PARTIAL${NC} - Has role check but may need redirect"
                secure_pages=$((secure_pages + 1))
            elif [ $has_redirect -gt 0 ]; then
                echo -e "${YELLOW}⚠ PARTIAL${NC} - Has redirect but no role check"
                vulnerable_pages=$((vulnerable_pages + 1))
            else
                echo -e "${RED}✗ VULNERABLE${NC} - No authorization checks!"
                vulnerable_pages=$((vulnerable_pages + 1))
            fi
            
            echo "  - useAuth: $([ $has_useauth -gt 0 ] && echo '✓' || echo '✗')"
            echo "  - Role Check: $([ $has_role_check -gt 0 ] && echo '✓' || echo '✗')"
            echo "  - Redirect: $([ $has_redirect -gt 0 ] && echo '✓' || echo '✗')"
        else
            echo -e "${RED}✗ VULNERABLE${NC} - No useAuth hook!"
            vulnerable_pages=$((vulnerable_pages + 1))
        fi
    fi
}

echo ""
echo "Scanning all pages..."
echo ""

# Find and check all page.tsx files
while IFS= read -r file; do
    check_page_security "$file"
done < <(find /Users/jw/fyp_system/frontend/app -name "page.tsx" -type f | sort)

echo ""
echo "=================================================="
echo "📊 SECURITY AUDIT SUMMARY"
echo "=================================================="
echo ""
echo "Total Pages Scanned: $total_pages"
echo -e "${GREEN}Secure Pages: $secure_pages${NC}"
echo -e "${BLUE}Public Pages: $public_pages${NC}"
echo -e "${RED}Vulnerable Pages: $vulnerable_pages${NC}"
echo ""

if [ $vulnerable_pages -eq 0 ]; then
    echo -e "${GREEN}✓ ALL PAGES ARE SECURE!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}⚠ SECURITY ISSUES FOUND!${NC}"
    echo "Please review and fix vulnerable pages."
    echo ""
    exit 1
fi
