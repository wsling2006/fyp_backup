#!/bin/bash
# =======================================================
# 🚀 ONE-LINE COMMAND TO UPDATE EC2 WITH SECURITY FIXES
# =======================================================
# Copy and paste this ENTIRE line into your EC2 terminal:

cd ~/fyp_system && git pull origin main && chmod +x security-audit.sh deploy-security-fix-to-ec2.sh && cd frontend && npm install && npm run build && cd .. && echo "" && echo "🔍 Running Security Audit..." && echo "" && ./security-audit.sh && echo "" && echo "✅ Update Complete! Restart your application now." && echo ""
