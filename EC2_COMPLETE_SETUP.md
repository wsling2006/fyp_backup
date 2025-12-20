# Complete EC2 Setup Guide

This guide walks you through setting up the FYP system on EC2 from scratch, including cloning the repository, setting up the database, and starting the services.

## Prerequisites

- EC2 instance running Ubuntu/Debian with Node.js and PostgreSQL installed
- GitHub credentials or SSH key configured for git access
- Sufficient disk space and memory for the application

## Step 1: Clone the Repository

```bash
# Navigate to your desired directory (e.g., home directory or /opt)
cd /home/ubuntu  # or your preferred location

# Clone the repository
git clone https://github.com/yourusername/fyp_system.git
cd fyp_system
```

## Step 2: Install Dependencies

### Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

## Step 3: Set Up Environment Variables

### Backend

Create `backend/.env` file:

```bash
cat > backend/.env << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=fyp_user
DB_PASSWORD=fyp_password
DB_NAME=fyp_db
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=86400
FRONTEND_URL=http://your-ec2-ip:3000
BACKEND_API_URL=http://your-ec2-ip:3001
NODE_ENV=production
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
CLAMAV_ENABLED=false
UPLOAD_DIR=/data/uploads
LOG_DIR=/data/logs
EMAIL_SERVICE=gmail
EMAIL_FROM=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EOF
```

### Frontend

Create `frontend/.env.local` file:

```bash
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://your-ec2-ip:3001
NEXT_PUBLIC_APP_URL=http://your-ec2-ip:3000
EOF
```

## Step 4: Set Up PostgreSQL Database

The repository includes automated setup scripts. Use one of these options:

### Option A: Quick Setup (Recommended)

```bash
# Make the script executable
chmod +x quick-setup-db.sh

# Run the quick setup script
./quick-setup-db.sh
```

This script will:
- Create the `fyp_db` database
- Create the `fyp_user` with password
- Run all migrations
- Verify the setup

### Option B: Manual Setup

If you prefer to set up manually or troubleshoot:

```bash
# Make the script executable
chmod +x setup-database.sh

# Run the comprehensive setup script with verbose output
./setup-database.sh -v
```

### Option C: Troubleshooting

If you encounter database issues, consult:

```bash
cat DATABASE_SETUP_TROUBLESHOOTING.md
```

## Step 5: Build the Applications

### Backend

```bash
cd backend

# Build the application
npm run build

# Verify the build
ls -la dist/
cd ..
```

### Frontend

```bash
cd frontend

# Build the application
npm run build

# Verify the build
ls -la .next/
cd ..
```

## Step 6: Start Services with PM2

### Install PM2 (if not already installed)

```bash
sudo npm install -g pm2
```

### Configure PM2

The repository includes an `ecosystem.config.js` file. Check and update it:

```bash
cat ecosystem.config.js
```

Make sure paths are correct for your EC2 setup.

### Start Services

```bash
# Start all services
pm2 start ecosystem.config.js

# Save PM2 configuration to restart on reboot
pm2 save

# Set up PM2 to start on system reboot
pm2 startup
# (Follow the instructions displayed by the command)
```

### Verify Services are Running

```bash
pm2 list
pm2 logs
```

## Step 7: Configure Nginx (Optional but Recommended)

The repository includes an `nginx.conf` file. Set it up as a reverse proxy:

```bash
# Install nginx if not already installed
sudo apt-get update
sudo apt-get install -y nginx

# Copy the nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/fyp_system

# Enable the configuration
sudo ln -s /etc/nginx/sites-available/fyp_system /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## Step 8: Verify the Setup

### Check Database

```bash
psql -U fyp_user -d fyp_db -h localhost -c "\dt"
```

You should see tables like:
- users
- revenue_record
- other entities

### Check Backend Health

```bash
curl http://localhost:3001/api/health
```

Expected response: `{"status":"ok"}`

### Check Frontend

Open browser and navigate to `http://your-ec2-ip:3000`

### Check PM2 Services

```bash
pm2 list
pm2 logs backend
pm2 logs frontend
```

## Step 9: Verify Revenue Edit/Delete Functionality

1. Log in to the frontend as an accountant user
2. Navigate to the Revenue section
3. Create a new revenue record
4. Verify that you can see Edit and Delete buttons on your own records
5. Verify that you cannot see Edit/Delete buttons on other users' records
6. Test editing and deleting your own records

## Step 10: Monitor and Maintain

### View Logs

```bash
# View all logs
pm2 logs

# View specific service logs
pm2 logs backend
pm2 logs frontend

# View logs with real-time streaming
pm2 logs --lines 100 --stream
```

### Restart Services

```bash
# Restart all services
pm2 restart all

# Restart specific service
pm2 restart backend
```

### Stop Services

```bash
# Stop all services
pm2 stop all

# Stop specific service
pm2 stop backend
```

### Monitor System Resources

```bash
pm2 monit
```

## Troubleshooting

### Issue: "database does not exist"

Run the database setup script:

```bash
./quick-setup-db.sh
```

### Issue: Backend won't start

Check logs:

```bash
pm2 logs backend --lines 50
```

Common causes:
- Database connection issues (check `.env` settings)
- Missing environment variables
- Port already in use (3001)

### Issue: Frontend won't connect to backend

Check:
- Backend is running: `pm2 list`
- Network connectivity: `curl http://localhost:3001/api/health`
- Frontend `.env.local` has correct API URL
- Firewall/security group allows port 3001

### Issue: Can't edit/delete revenue records

1. Verify you're logged in as the user who created the record
2. Check backend logs: `pm2 logs backend`
3. Verify database has correct ownership data: 
   ```bash
   psql -U fyp_user -d fyp_db -c "SELECT id, created_by_user_id, created_by FROM revenue_record LIMIT 5;"
   ```

## Useful Commands

```bash
# Check if ports are in use
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Connect to PostgreSQL
psql -U fyp_user -d fyp_db -h localhost

# View PM2 logs
pm2 logs

# Save PM2 list on reboot
pm2 save

# Stop all PM2 services
pm2 kill
```

## Next Steps

1. After initial setup, verify all services are running
2. Test the revenue edit/delete functionality
3. Monitor logs for any errors
4. Set up regular backups of the database
5. Configure monitoring and alerting (optional)

## Support

If you encounter issues:

1. Check `DATABASE_SETUP_TROUBLESHOOTING.md` for database-related issues
2. Review `REVENUE_EDIT_DELETE_IMPLEMENTATION.md` for feature-specific information
3. Check PM2 logs: `pm2 logs`
4. Verify environment variables are set correctly
5. Ensure all services are running: `pm2 list`
