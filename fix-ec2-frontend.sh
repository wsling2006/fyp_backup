#!/bin/bash
# Fix Frontend on EC2
# Run this script on your EC2 server

set -e

echo "=========================================="
echo "EC2 Frontend Fix Script"
echo "=========================================="
echo ""

cd ~/fyp_system/frontend

echo "1. Stopping frontend..."
pm2 stop frontend 2>/dev/null || true
pm2 delete frontend 2>/dev/null || true
sleep 2

echo ""
echo "2. Checking .env.local file..."
if [ ! -f .env.local ]; then
    echo "Creating .env.local..."
    cat > .env.local << 'EOF'
# Next.js Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF
    echo "✓ .env.local created"
else
    echo "✓ .env.local already exists"
    cat .env.local
fi

echo ""
echo "3. Installing/updating dependencies..."
npm install

echo ""
echo "4. Building frontend..."
npm run build

echo ""
echo "5. Starting frontend with PM2..."
cd ~/fyp_system
pm2 start ecosystem.config.js --only frontend
sleep 3

echo ""
echo "6. Checking frontend status..."
pm2 list

echo ""
echo "7. Testing frontend..."
sleep 2
if curl -s http://localhost:3001 | head -1 | grep -q "<!DOCTYPE"; then
    echo "✓ Frontend is responding!"
else
    echo "⚠️  Frontend may not be responding correctly"
    echo "Check logs: pm2 logs frontend"
fi

echo ""
echo "=========================================="
echo "✓ Frontend Fix Complete!"
echo "=========================================="
echo ""
echo "Frontend URL: http://your-ec2-ip:3001"
echo "Backend API: http://your-ec2-ip:3000"
echo ""
echo "Useful commands:"
echo "  pm2 list              - Show all processes"
echo "  pm2 logs frontend     - View frontend logs"
echo "  pm2 restart frontend  - Restart frontend"
echo ""
