#!/bin/bash

echo "=== Force Kill Port 3000 and Restart Backend ==="
echo "Starting at: $(date)"
echo ""

# Stop PM2 first
echo "1. Stopping PM2 processes..."
pm2 stop all
pm2 delete all
sleep 2

# Find and kill all processes on port 3000
echo ""
echo "2. Finding processes on port 3000..."
PORT_PIDS=$(lsof -ti:3000)

if [ -z "$PORT_PIDS" ]; then
    echo "No processes found on port 3000"
else
    echo "Found PIDs on port 3000: $PORT_PIDS"
    echo "Killing with SIGTERM..."
    kill $PORT_PIDS 2>/dev/null
    sleep 2
    
    # Check if still running
    PORT_PIDS=$(lsof -ti:3000)
    if [ ! -z "$PORT_PIDS" ]; then
        echo "Processes still running. Killing with SIGKILL..."
        kill -9 $PORT_PIDS 2>/dev/null
        sleep 2
    fi
fi

# Verify port is free
echo ""
echo "3. Verifying port 3000 is free..."
PORT_CHECK=$(lsof -ti:3000)
if [ ! -z "$PORT_CHECK" ]; then
    echo "ERROR: Port 3000 is still in use by PID: $PORT_CHECK"
    echo "Process details:"
    ps aux | grep $PORT_CHECK | grep -v grep
    echo ""
    echo "You may need to manually kill this process:"
    echo "sudo kill -9 $PORT_CHECK"
    exit 1
else
    echo "✓ Port 3000 is now free"
fi

# Navigate to backend
cd /Users/jw/fyp_system/backend || exit 1

# Build backend
echo ""
echo "4. Building backend..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Backend build failed"
    exit 1
fi
echo "✓ Backend built successfully"

# Run migrations
echo ""
echo "5. Running migrations..."
npm run migration:run
if [ $? -ne 0 ]; then
    echo "WARNING: Migration failed, but continuing..."
fi

# Start PM2 from root directory
cd /Users/jw/fyp_system || exit 1
echo ""
echo "6. Starting PM2..."
pm2 start ecosystem.config.js
sleep 3

# Check PM2 status
echo ""
echo "7. Checking PM2 status..."
pm2 list

# Check if backend is listening on port 3000
echo ""
echo "8. Checking if backend is listening on port 3000..."
sleep 2
PORT_CHECK=$(lsof -ti:3000)
if [ ! -z "$PORT_CHECK" ]; then
    echo "✓ Backend is now listening on port 3000 (PID: $PORT_CHECK)"
    echo ""
    echo "Process details:"
    ps aux | grep $PORT_CHECK | grep -v grep
else
    echo "ERROR: Backend is not listening on port 3000"
    echo ""
    echo "Checking PM2 logs..."
    pm2 logs backend --lines 20 --nostream
fi

echo ""
echo "=== Done at: $(date) ==="
