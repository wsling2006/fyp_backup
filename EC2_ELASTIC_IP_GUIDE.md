# 🔧 EC2 Elastic IP & Instance Restart Guide

## The Problem You're Asking About

When you **stop and restart** an EC2 instance with a **public IP address**, the IP will change. This breaks:
- ❌ Frontend's `NEXT_PUBLIC_API_URL` (hardcoded IP)
- ❌ Backend's `FRONTEND_URL` (hardcoded IP)
- ❌ Any client bookmarks or DNS records

## ✅ The Solutions

You have **3 options** - choose based on your needs:

---

## Option 1: Use Elastic IP (RECOMMENDED for Production) 🌟

**What it is**: A static public IP that stays the same even when you stop/start the instance.

**Cost**: Free as long as the instance is running. $0.005/hour if instance is stopped.

### How to Set It Up

#### Step 1: Allocate an Elastic IP
```bash
# Using AWS CLI
aws ec2 allocate-address --domain vpc
```

Or through AWS Console:
1. Go to EC2 → Elastic IPs
2. Click "Allocate Elastic IP address"
3. Click "Allocate"
4. Note the new IP address

#### Step 2: Associate with Your Instance
```bash
# Using AWS CLI
aws ec2 associate-address \
  --instance-id i-xxxxxxxx \
  --allocation-id eipalloc-xxxxxxxx
```

Or through AWS Console:
1. Go to EC2 → Elastic IPs
2. Select your Elastic IP
3. Click "Associate Elastic IP address"
4. Choose your instance
5. Click "Associate"

#### Step 3: Update Your Configuration

Now your IP will **never change**, so you only set it once:

**backend/.env** (set once, never change):
```bash
FRONTEND_URL=http://3.xxx.xxx.xxx:3000      # Your Elastic IP
BACKEND_API_URL=http://3.xxx.xxx.xxx:3001
```

**frontend/.env.local** (set once, never change):
```bash
NEXT_PUBLIC_API_URL=http://3.xxx.xxx.xxx:3001   # Your Elastic IP
```

#### Step 4: Test It
```bash
# Stop the instance
aws ec2 stop-instances --instance-ids i-xxxxxxxx

# Wait 2 minutes

# Start the instance
aws ec2 start-instances --instance-ids i-xxxxxxxx

# Wait for it to boot (2-3 minutes)

# The Elastic IP stays the same! ✅
# Your app still works! ✅
```

**Advantages of Elastic IP:**
- ✅ IP never changes
- ✅ Set config once, forget about it
- ✅ Professional/production-grade
- ✅ Works with DNS records
- ✅ Free while instance running

**Cost**: Free (while running) or $0.005/hour (while stopped)

---

## Option 2: Use a Domain Name (BETTER for Production)

**What it is**: Instead of using IP addresses, use a domain name like `app.yourdomain.com`.

### How to Set It Up

#### Step 1: Buy a Domain (if you don't have one)
- Godaddy, Namecheap, Route53, etc.
- Cost: ~$10/year

#### Step 2: Create Route53 Hosted Zone (AWS)
```bash
# Using AWS CLI
aws route53 create-hosted-zone \
  --name yourdomain.com \
  --caller-reference $(date +%s)
```

Or through AWS Console:
1. Go to Route53 → Hosted Zones
2. Click "Create hosted zone"
3. Enter your domain name
4. Click "Create hosted zone"

#### Step 3: Point Your Domain to Elastic IP
```bash
# Using AWS CLI
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXX \
  --change-batch file://changes.json
```

**changes.json**:
```json
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.yourdomain.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "YOUR_ELASTIC_IP"}]
      }
    }
  ]
}
```

#### Step 4: Update Your Configuration

Now you use domain names instead of IPs:

**backend/.env**:
```bash
FRONTEND_URL=http://app.yourdomain.com:3000
BACKEND_API_URL=http://app.yourdomain.com:3001
```

**frontend/.env.local**:
```bash
NEXT_PUBLIC_API_URL=http://app.yourdomain.com:3001
```

**Advantages:**
- ✅ IP changes don't matter (DNS resolves it)
- ✅ Professional appearance
- ✅ Easy to remember
- ✅ Works with SSL/HTTPS
- ✅ Can move instance easily
- ✅ Looks like a real company

**Cost**: ~$10/year for domain + free Route53

---

## Option 3: Update Config on Every Restart (NOT Recommended)

**What it is**: Every time you restart, update the `.env` files with the new IP.

### Steps
1. Stop instance
2. Start instance
3. Get new public IP: `aws ec2 describe-instances --instance-ids i-xxxxx`
4. SSH into instance
5. Update `backend/.env` and `frontend/.env.local`
6. Rebuild frontend: `cd frontend && npm run build`
7. Restart PM2: `pm2 restart all`

**Disadvantages:**
- ❌ Manual every time
- ❌ Easy to forget
- ❌ Error-prone
- ❌ Breaks client connections
- ❌ Not professional

**Only use this if:** Testing/development and you rarely restart

---

## 🏆 RECOMMENDED SOLUTION

### For Development/Testing
**Use Elastic IP** (Option 1)
- Set it once
- Forget about it
- Never worry about IP changes
- Free!

### For Production
**Use Domain + Elastic IP** (Option 2)
- Professional appearance
- IP changes don't matter (DNS)
- SSL/HTTPS compatible
- Easy to scale later
- Total cost: ~$10/year

---

## Quick Decision Tree

```
Are you in PRODUCTION?
├─ YES → Use Option 2 (Domain + Elastic IP)
└─ NO → Use Option 1 (Elastic IP)

Can you handle manual updates?
├─ YES → Option 3 (NOT RECOMMENDED)
└─ NO → Use Option 1 or 2

Do you have a domain?
├─ YES → Use Option 2
└─ NO → Use Option 1 (cheap enough to add domain later)
```

---

## Step-by-Step: Elastic IP Setup (5 minutes)

### 1. Allocate Elastic IP
```bash
# Get your instance ID first
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text)

echo "Instance ID: $INSTANCE_ID"

# Allocate Elastic IP
ELASTIC_IP=$(aws ec2 allocate-address --domain vpc \
  --query 'PublicIp' \
  --output text)

echo "Elastic IP: $ELASTIC_IP"
```

### 2. Associate with Your Instance
```bash
# Get allocation ID
ALLOCATION_ID=$(aws ec2 describe-addresses \
  --public-ips $ELASTIC_IP \
  --query 'Addresses[0].AllocationId' \
  --output text)

echo "Allocation ID: $ALLOCATION_ID"

# Associate
aws ec2 associate-address \
  --instance-id $INSTANCE_ID \
  --allocation-id $ALLOCATION_ID

echo "Associated Elastic IP: $ELASTIC_IP"
```

### 3. Update Your .env Files
```bash
# SSH into your instance
ssh -i your-key.pem ubuntu@$ELASTIC_IP

# Update backend/.env
cat > backend/.env << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=fyp_db
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://YOUR_ELASTIC_IP:3000
BACKEND_API_URL=http://YOUR_ELASTIC_IP:3001
NODE_ENV=production
EOF

# Update frontend/.env.local
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://YOUR_ELASTIC_IP:3001
EOF

# Rebuild
cd frontend && npm run build && cd ..
pm2 restart frontend
```

### 4. Test It Works
```bash
# Stop instance
aws ec2 stop-instances --instance-ids $INSTANCE_ID
sleep 120

# Start instance
aws ec2 start-instances --instance-ids $INSTANCE_ID
sleep 180

# Check it works
curl http://$ELASTIC_IP:3001/api/health
# Should work! ✅
```

---

## FAQ

### Q1: Will my app crash if I stop and restart with Elastic IP?
**A**: No! With Elastic IP:
- The IP stays the same
- Your `.env` files don't need updating
- Your app continues working
- Users won't notice anything

### Q2: What if I forget to associate the Elastic IP?
**A**: The instance gets a new public IP. Your app breaks because:
- The IP in `.env` files is different
- You need to manually update them
- This is why you should use Elastic IP!

### Q3: How much does Elastic IP cost?
**A**: 
- **Free** while instance is running
- **$0.005/hour** if instance is stopped but IP is allocated
- Recommendation: Release the IP if you stop the instance for long periods

### Q4: Can I move Elastic IP to another instance?
**A**: Yes! Just disassociate and associate with another instance. This is great for:
- Scaling horizontally
- Zero-downtime deployments
- Easy switchover

### Q5: Should I use Elastic IP or Domain?
**A**: Both! 
- Elastic IP = stable IP address (prevents changes)
- Domain = human-readable address (yourdomain.com)
- Use Elastic IP + point Domain to it = best solution

---

## What To Do RIGHT NOW

### Option 1: Quick Fix (Elastic IP)
```bash
# 1. Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# 2. Associate with your instance
aws ec2 associate-address \
  --instance-id i-xxxxxxxx \
  --allocation-id eipalloc-xxxxxxxx

# 3. Update .env files with the Elastic IP
# 4. Rebuild and restart
# 5. Done! No more IP changes on restart
```

**Time needed**: 10 minutes
**Cost**: Free

### Option 2: Professional Setup (Domain + Elastic IP)
```bash
# 1. Get Elastic IP (as above)
# 2. Buy domain (godaddy.com)
# 3. Set up Route53 hosted zone
# 4. Point domain to Elastic IP
# 5. Use domain in .env files
# 6. Done! Professional setup
```

**Time needed**: 30 minutes
**Cost**: ~$10/year

---

## Summary

| Approach | IP Changes? | Setup Time | Cost | For Production? |
|----------|------------|-----------|------|-----------------|
| **Elastic IP** | ❌ No | 10 min | Free | ✅ Yes |
| **Domain + Elastic IP** | ❌ No | 30 min | $10/yr | ✅ Yes |
| **Manual Updates** | ✅ Yes | Every restart | Free | ❌ No |

**My Recommendation**: Use **Elastic IP** immediately. Add a domain later if you want.

Your concern was absolutely valid, and this solution fixes it permanently! 🎯

---

## Next Steps

1. **Right now**: Allocate an Elastic IP (5 minutes)
2. **Today**: Associate it with your instance (5 minutes)
3. **Today**: Update your `.env` files (5 minutes)
4. **Test**: Stop and restart your instance (verify it works)
5. **Optional**: Add a domain name (when ready)

Then you never have to worry about IP changes again! ✅
