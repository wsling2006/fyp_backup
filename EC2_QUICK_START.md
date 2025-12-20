# EC2 Quick Start (5 Minutes)

**For the impatient developer:** Follow these commands in order, copy-paste each block.

## Step 1: Clone & Navigate (1 min)

```bash
cd /home/ubuntu
git clone https://github.com/yourusername/fyp_system.git
cd fyp_system
```

## Step 2: Set Up Database (1 min)

```bash
chmod +x quick-setup-db.sh
./quick-setup-db.sh
```

**Expected output:**
```
✅ PostgreSQL is running
✅ Database fyp_db created
✅ Successfully connected to fyp_db
```

If not, see Troubleshooting at the bottom.

## Step 3: Environment Variables (1 min)

Get your EC2 IP:
```bash
echo "http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
```

Create `backend/.env`:
```bash
cat > backend/.env << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=fyp_db
JWT_SECRET=$(openssl rand -base64 32)
FRONTEND_URL=http://YOUR_EC2_IP:3000
BACKEND_API_URL=http://YOUR_EC2_IP:3001
NODE_ENV=production
EOF
```

Create `frontend/.env.local`:
```bash
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://YOUR_EC2_IP:3001
EOF
```

**Replace `YOUR_EC2_IP`** with your actual IP address.

## Step 4: Install & Build (2 mins)

```bash
# Backend
cd backend && npm install && npm run build && cd ..

# Frontend
cd frontend && npm install && npm run build && cd ..
```

## Step 5: Start Services (0.5 mins)

```bash
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 list
```

Done! Services should all show "online".

---

## ✅ Verify It Works

### Backend running?
```bash
curl http://localhost:3001/api/health
```

### Frontend ready?
Open browser: `http://YOUR_EC2_IP:3000`

### Can you test edit/delete?
1. Login as accountant
2. Go to Revenue section
3. Create a record
4. Should see Edit/Delete buttons
5. Click them - should work!

---

## 🔧 If Something Breaks

### "database does not exist"
```bash
./quick-setup-db.sh
pm2 restart backend
```

### "port already in use"
```bash
lsof -i :3000
lsof -i :3001
# Kill the process if needed:
kill -9 <PID>
```

### "backend won't start"
```bash
pm2 logs backend --lines 50
```

Check:
- Is database running? `sudo systemctl status postgresql`
- Is `.env` correct? `cat backend/.env`
- Do environment variables match? `grep DB_ backend/.env`

### "frontend won't load"
```bash
pm2 logs frontend --lines 50
```

Check:
- Is backend running? `curl http://localhost:3001/api/health`
- Is `NEXT_PUBLIC_API_URL` correct? `cat frontend/.env.local`
- Is IP address the public IP, not localhost?

---

## 📚 Full Docs

For detailed explanations, see:
- `EC2_COMPLETE_SETUP.md` - Full setup guide
- `EC2_SETUP_CHECKLIST.md` - Step-by-step checklist
- `DATABASE_SETUP_TROUBLESHOOTING.md` - Database issues

---

## 💡 Useful Commands

```bash
# Check services
pm2 list

# Restart everything
pm2 restart all

# View logs
pm2 logs

# Stop services
pm2 stop all

# See what's listening
netstat -tuln | grep -E '3000|3001|5432'

# Connect to database
psql -U postgres -d fyp_db

# Pull latest code
git pull origin main
```

That's it! You're done. Go test the app. 🚀
