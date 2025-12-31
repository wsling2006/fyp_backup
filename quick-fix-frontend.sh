#!/bin/bash
# Quick Frontend Fix - Run on EC2

echo "Fixing frontend port configuration..."

# Stop frontend
pm2 stop frontend 2>/dev/null || true
pm2 delete frontend 2>/dev/null || true

# Kill anything on port 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

cd ~/fyp_system/frontend

# Create/update .env.local with PORT
cat > .env.local << 'EOF'
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF

echo "✓ .env.local updated with PORT=3001"

# Start frontend with explicit port
cd ~/fyp_system
PORT=3001 pm2 start ecosystem.config.js --only frontend --env production

sleep 3
pm2 list

echo ""
echo "Frontend should now be running on port 3001"
echo "Check logs: pm2 logs frontend"
