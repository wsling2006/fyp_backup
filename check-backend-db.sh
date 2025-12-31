#!/bin/bash

echo "=== Checking Backend Database Connection ==="
echo ""

# Check if backend process is running
BACKEND_PID=$(lsof -ti:3000)
if [ -z "$BACKEND_PID" ]; then
    echo "ERROR: Backend is not running on port 3000"
    exit 1
fi

echo "✓ Backend is running (PID: $BACKEND_PID)"
echo ""

# Check logs for database connection info
echo "Checking logs for database connection..."
cd /Users/jw/fyp_system/backend

if [ -f "logs/backend-error.log" ]; then
    echo "Last 30 lines of error log:"
    tail -30 logs/backend-error.log
fi

echo ""
echo "Checking for .env file..."
if [ -f ".env" ]; then
    echo "✓ .env file exists"
    echo "Database credentials:"
    grep -E "^DB_|^DATABASE" .env | sed 's/PASSWORD=.*/PASSWORD=***/'
else
    echo "ERROR: .env file not found!"
    echo ""
    echo "Checking for environment variables in process..."
    # Try to get env vars from running process (may not work for all vars)
    ps eww $BACKEND_PID 2>/dev/null | tr '\0' '\n' | grep -E '^(DB_|DATABASE)' || echo "Could not read process environment"
fi

echo ""
echo "Checking which databases exist..."
psql -U postgres -l 2>&1 | grep -E "fyp|Name"

echo ""
echo "=== End of Check ==="
