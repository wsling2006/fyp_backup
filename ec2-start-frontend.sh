#!/bin/bash
# EC2 Frontend Start Commands

echo "🚀 Starting Frontend on EC2"
echo "=============================="
echo ""

# Run these commands on your EC2 server
cat << 'COMMANDS'

cd ~/fyp_system/frontend

# Start frontend with PM2
pm2 start npm --name "frontend" -- start

# Check status
pm2 status

# View logs
pm2 logs frontend --lines 50

# Test the endpoint
sleep 5
curl -I http://localhost:3001/purchase-requests

COMMANDS
