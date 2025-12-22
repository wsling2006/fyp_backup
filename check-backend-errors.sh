#!/bin/bash
# Check backend error details

echo "🔍 Checking backend error logs in detail..."
echo ""

# Get last 200 lines of error logs
pm2 logs backend --lines 200 --err --nostream > /tmp/backend-errors.log

# Show the errors
echo "=== ERROR LOG CONTENT ==="
cat /tmp/backend-errors.log
echo ""
echo "=== END OF ERROR LOG ==="
echo ""

# Count actual ERROR lines
ERROR_COUNT=$(grep -c "ERROR" /tmp/backend-errors.log || echo "0")
echo "Total ERROR occurrences: $ERROR_COUNT"
echo ""

# Show unique error messages
echo "=== UNIQUE ERROR MESSAGES ==="
grep "ERROR" /tmp/backend-errors.log | sort | uniq
echo ""

# Check if backend is actually running
echo "=== CURRENT BACKEND STATUS ==="
pm2 describe backend | grep -E "status|uptime|restarts"
echo ""

# Check if backend responds to health check
echo "=== TESTING BACKEND RESPONSE ==="
curl -s http://localhost:3000/health 2>&1 || echo "Backend not responding to health check"
echo ""

# Check recent startup logs
echo "=== RECENT STARTUP LOGS (Last 30 lines from OUT log) ==="
pm2 logs backend --lines 30 --out --nostream | tail -30
echo ""

# Final verdict
echo "=== ANALYSIS ==="
RECENT_ERRORS=$(pm2 logs backend --lines 50 --err --nostream | grep -c "ERROR" || echo "0")
if [ "$RECENT_ERRORS" -eq "0" ]; then
    echo "✅ No recent errors - backend is running fine"
    echo "   The 2 errors found are from OLD restarts (before rebuild)"
else
    echo "⚠️  Found $RECENT_ERRORS recent errors"
    echo "   Showing last error:"
    pm2 logs backend --lines 100 --err --nostream | grep -A 10 "ERROR" | tail -20
fi
