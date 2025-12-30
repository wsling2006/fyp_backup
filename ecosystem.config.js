/**
 * PM2 Ecosystem Configuration
 * 
 * This file defines how PM2 should manage the backend and frontend applications.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 delete ecosystem.config.js
 * 
 * For production deployment on EC2.
 */

module.exports = {
  apps: [
    {
      // ==========================================
      // BACKEND (NestJS)
      // ==========================================
      name: 'backend',
      script: './dist/src/main.js', // Updated path to match actual build output
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork', // Use fork mode for single instance (more stable for NestJS)
      
      // Environment variables (production)
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      
      // Auto-restart configuration
      autorestart: true,
      watch: false, // Disable in production (enable only in development)
      max_memory_restart: '500M', // Restart if memory exceeds 500MB
      
      // Logging
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Advanced settings
      listen_timeout: 10000, // Wait 10s for app to be ready
      kill_timeout: 5000, // Wait 5s before force kill
      wait_ready: true, // Wait for app to emit 'ready' signal
      
      // Restart strategy
      min_uptime: 10000, // Min uptime before considered stable (10s)
      max_restarts: 10, // Max restart attempts
      restart_delay: 4000, // Delay between restart attempts (4s)
      
      // Process management
      shutdown_with_message: true,
    },
    
    {
      // ==========================================
      // FRONTEND (Next.js)
      // ==========================================
      name: 'frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'fork', // Use fork mode for Next.js (recommended for single instance)
      
      // Environment variables (production)
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        NEXT_PUBLIC_API_URL: 'http://localhost:3000',
      },
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // Next.js can use more memory
      
      // Logging
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Advanced settings
      listen_timeout: 30000, // Wait 30s for Next.js to be ready (build cache, etc.)
      kill_timeout: 5000,
      wait_ready: false, // Next.js doesn't emit ready signal
      
      // Restart strategy
      min_uptime: 10000,
      max_restarts: 10,
      restart_delay: 4000,
      
      // Process management
      shutdown_with_message: true,
    }
  ],
  
  // ==========================================
  // DEPLOYMENT CONFIGURATION (Optional)
  // ==========================================
  deploy: {
    production: {
      user: 'ubuntu', // EC2 default user
      host: process.env.EC2_HOST || 'YOUR_EC2_IP',
      ref: 'origin/main',
      repo: 'YOUR_GIT_REPO_URL',
      path: '/home/ubuntu/app',
      'post-deploy': 'cd backend && npm install && npm run build && cd ../frontend && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
