#!/bin/bash

# Quick EC2 Update Script
# This script updates the frontend on EC2 with the latest GitHub changes

set -e  # Exit on error

echo "🚀 Starting EC2 Update Process..."
echo "================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if SSH key path is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: SSH key path not provided${NC}"
    echo "Usage: ./quick-update-ec2.sh /path/to/your-key.pem your-ec2-ip"
    echo "Example: ./quick-update-ec2.sh ~/Downloads/my-key.pem 54.123.45.67"
    exit 1
fi

# Check if EC2 IP is provided
if [ -z "$2" ]; then
    echo -e "${RED}Error: EC2 IP address not provided${NC}"
    echo "Usage: ./quick-update-ec2.sh /path/to/your-key.pem your-ec2-ip"
    echo "Example: ./quick-update-ec2.sh ~/Downloads/my-key.pem 54.123.45.67"
    exit 1
fi

SSH_KEY="$1"
EC2_IP="$2"

echo -e "${YELLOW}Step 1: Connecting to EC2...${NC}"
echo "SSH Key: $SSH_KEY"
echo "EC2 IP: $EC2_IP"
echo ""

# Update command to run on EC2
UPDATE_COMMAND="
set -e
cd /home/ubuntu/fyp_system

echo '📥 Pulling latest changes from GitHub...'
git pull origin main

echo ''
echo '🔨 Building frontend...'
cd frontend
npm install
npm run build

echo ''
echo '🔄 Restarting frontend service...'
pm2 restart frontend

echo ''
echo '✅ Update complete!'
echo ''
echo '📊 Service Status:'
pm2 status

echo ''
echo '📝 Recent logs:'
pm2 logs frontend --lines 20 --nostream
"

# Execute update on EC2
ssh -i "$SSH_KEY" ubuntu@"$EC2_IP" "$UPDATE_COMMAND"

echo ""
echo -e "${GREEN}=================================${NC}"
echo -e "${GREEN}✅ EC2 Update Complete!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo "🌐 Access your application at: http://$EC2_IP:3000"
echo ""
echo "📝 To view logs: ssh -i $SSH_KEY ubuntu@$EC2_IP 'pm2 logs frontend'"
echo "📊 To check status: ssh -i $SSH_KEY ubuntu@$EC2_IP 'pm2 status'"
echo ""
