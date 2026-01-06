# SAMPLE CODE IMPLEMENTATION - PART 4: Dashboard, Business Logic & Deployment

**Project:** Zero Trust Access Control System  
**Date:** January 6, 2026  

---

## TABLE OF CONTENTS - PART 4

1. [Dashboard Implementation](#dashboard-implementation)
2. [Purchase Request Workflow](#purchase-request-workflow)
3. [Deployment Configuration](#deployment-configuration)
4. [Testing & Validation](#testing--validation)
5. [Security Checklist](#security-checklist)

---

## 1. DASHBOARD IMPLEMENTATION

### 1.1 Dashboard Page

**File:** `frontend/app/dashboard/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

interface DashboardStats {
  totalUsers?: number;
  totalEmployees?: number;
  totalPurchaseRequests?: number;
  totalClaims?: number;
  pendingClaims?: number;
  totalRevenue?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch stats based on user role
      if (user?.role === 'super_admin') {
        const [users, employees, prs, claims] = await Promise.all([
          api.get('/users'),
          api.get('/employees'),
          api.get('/purchase-requests'),
          api.get('/claims'),
        ]);
        
        setStats({
          totalUsers: users.data.length,
          totalEmployees: employees.data.length,
          totalPurchaseRequests: prs.data.length,
          totalClaims: claims.data.length,
          pendingClaims: claims.data.filter((c: any) => c.status === 'PENDING').length,
        });
      } else if (user?.role === 'accountant') {
        const [prs, claims, revenue] = await Promise.all([
          api.get('/purchase-requests'),
          api.get('/claims'),
          api.get('/revenue'),
        ]);
        
        setStats({
          totalPurchaseRequests: prs.data.length,
          totalClaims: claims.data.length,
          pendingClaims: claims.data.filter((c: any) => c.status === 'PENDING').length,
          totalRevenue: revenue.data.reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0),
        });
      } else if (user?.role === 'human_resources') {
        const employees = await api.get('/employees');
        setStats({
          totalEmployees: employees.data.length,
        });
      } else if (user?.role === 'marketing' || user?.role === 'sales_department') {
        const prs = await api.get('/purchase-requests');
        setStats({
          totalPurchaseRequests: prs.data.length,
          totalClaims: prs.data.reduce(
            (sum: number, pr: any) => sum + (pr.claims?.length || 0),
            0
          ),
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames: Record<string, string> = {
      super_admin: 'Super Administrator',
      accountant: 'Accountant',
      human_resources: 'Human Resources',
      marketing: 'Marketing',
      sales_department: 'Sales Department',
    };
    return roleNames[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Welcome back, {user?.email}
            </p>
            <p className="text-sm text-gray-500">
              Role: {getRoleDisplayName(user?.role || '')}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.totalUsers !== undefined && (
              <StatCard
                title="Total Users"
                value={stats.totalUsers}
                icon="👥"
                color="blue"
              />
            )}
            
            {stats.totalEmployees !== undefined && (
              <StatCard
                title="Total Employees"
                value={stats.totalEmployees}
                icon="👨‍💼"
                color="green"
              />
            )}
            
            {stats.totalPurchaseRequests !== undefined && (
              <StatCard
                title="Purchase Requests"
                value={stats.totalPurchaseRequests}
                icon="📝"
                color="purple"
              />
            )}
            
            {stats.totalClaims !== undefined && (
              <StatCard
                title="Total Claims"
                value={stats.totalClaims}
                icon="💰"
                color="yellow"
              />
            )}
            
            {stats.pendingClaims !== undefined && (
              <StatCard
                title="Pending Claims"
                value={stats.pendingClaims}
                icon="⏳"
                color="red"
              />
            )}
            
            {stats.totalRevenue !== undefined && (
              <StatCard
                title="Total Revenue"
                value={`$${stats.totalRevenue.toLocaleString()}`}
                icon="📈"
                color="green"
              />
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(user?.role === 'marketing' || user?.role === 'sales_department') && (
                <QuickActionCard
                  title="Create Purchase Request"
                  description="Submit a new purchase request"
                  href="/purchase-requests/create"
                  icon="➕"
                />
              )}
              
              {user?.role === 'human_resources' && (
                <QuickActionCard
                  title="Add Employee"
                  description="Register a new employee"
                  href="/employees/create"
                  icon="👤"
                />
              )}
              
              {(user?.role === 'super_admin' || user?.role === 'accountant') && (
                <>
                  <QuickActionCard
                    title="Review Claims"
                    description="Process pending claims"
                    href="/accountant-files"
                    icon="✅"
                  />
                  <QuickActionCard
                    title="Add Revenue"
                    description="Record new revenue"
                    href="/revenue/create"
                    icon="💵"
                  />
                </>
              )}
              
              {user?.role === 'super_admin' && (
                <QuickActionCard
                  title="User Management"
                  description="Manage user accounts"
                  href="/user-management"
                  icon="⚙️"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`text-4xl ${colorClasses[color]} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <a
      href={href}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
    >
      <div className="flex items-start">
        <div className="text-3xl mr-4">{icon}</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </a>
  );
}
```

---

## 2. PURCHASE REQUEST WORKFLOW

### 2.1 Create Purchase Request Page

**File:** `frontend/app/purchase-requests/create/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

export default function CreatePurchaseRequestPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: user?.role === 'marketing' ? 'marketing' : 'sales_department',
    priority: 1,
    estimated_amount: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/purchase-requests', {
        ...formData,
        estimated_amount: parseFloat(formData.estimated_amount),
      });
      
      router.push('/purchase-requests');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Failed to create purchase request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'marketing', 'sales_department']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Create Purchase Request
            </h1>

            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Q1 Marketing Campaign Budget"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Provide detailed description of the purchase request..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department *
                </label>
                <select
                  name="department"
                  required
                  value={formData.department}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="marketing">Marketing</option>
                  <option value="sales_department">Sales Department</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Priority *
                </label>
                <select
                  name="priority"
                  required
                  value={formData.priority}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="1">1 - Normal</option>
                  <option value="2">2 - Medium</option>
                  <option value="3">3 - High</option>
                  <option value="4">4 - Very High</option>
                  <option value="5">5 - Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Estimated Amount ($) *
                </label>
                <input
                  type="number"
                  name="estimated_amount"
                  required
                  step="0.01"
                  min="0"
                  value={formData.estimated_amount}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Purchase Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
```

### 2.2 Upload Claim Page

**File:** `frontend/app/purchase-requests/[id]/upload-claim/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/lib/api';

export default function UploadClaimPage() {
  const router = useRouter();
  const params = useParams();
  const prId = params.id;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    vendor_name: '',
    amount_claimed: '',
    purchase_date: '',
    claim_description: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must not exceed 10MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only JPG, PNG, PDF, DOC, and DOCX files are allowed');
        return;
      }
      
      setError('');
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a receipt file');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('receipt', file);
      formDataToSend.append('vendor_name', formData.vendor_name);
      formDataToSend.append('amount_claimed', formData.amount_claimed);
      formDataToSend.append('purchase_date', formData.purchase_date);
      formDataToSend.append('claim_description', formData.claim_description);

      await api.post(`/purchase-requests/${prId}/claims`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      router.push(`/purchase-requests/${prId}`);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Failed to upload claim. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'marketing', 'sales_department']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Upload Claim Receipt
            </h1>

            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Receipt File * (JPG, PNG, PDF, DOC, DOCX - Max 10MB)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  required
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  name="vendor_name"
                  required
                  value={formData.vendor_name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Office Supplies Inc"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount Claimed ($) *
                </label>
                <input
                  type="number"
                  name="amount_claimed"
                  required
                  step="0.01"
                  min="0"
                  value={formData.amount_claimed}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Purchase Date *
                </label>
                <input
                  type="date"
                  name="purchase_date"
                  required
                  value={formData.purchase_date}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  name="claim_description"
                  required
                  rows={3}
                  value={formData.claim_description}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the expense..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Upload Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
```

---

## 3. DEPLOYMENT CONFIGURATION

### 3.1 PM2 Configuration

**File:** `ecosystem.config.js` (Root directory)

```javascript
module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './backend',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      time: true,
    },
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      time: true,
    },
  ],
};
```

### 3.2 Nginx Configuration

**File:** `nginx.conf`

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server localhost:3000;
    }

    upstream frontend {
        server localhost:3001;
    }

    server {
        listen 80;
        server_name your_domain.com;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        # Frontend (Next.js)
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Backend API (NestJS)
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Increase timeout for file uploads
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # File upload size limit
        client_max_body_size 10M;
    }
}
```

### 3.3 Deployment Script

**File:** `deploy.sh` (Root directory)

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# 1. Backend deployment
echo "📦 Building backend..."
cd backend
npm install --production=false
npm run build

# 2. Frontend deployment
echo "🎨 Building frontend..."
cd ../frontend
npm install --production=false
npm run build

# 3. Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null
then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# 4. Stop existing processes
echo "⏸️  Stopping existing processes..."
pm2 stop ecosystem.config.js || true

# 5. Start applications
echo "▶️  Starting applications..."
cd ..
pm2 start ecosystem.config.js

# 6. Save PM2 process list
pm2 save

# 7. Setup PM2 startup script (run once)
pm2 startup

echo "✅ Deployment complete!"
echo "📊 Check status with: pm2 status"
echo "📝 View logs with: pm2 logs"
```

### 3.4 Docker Compose (Alternative)

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    container_name: fyp_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: fyp_system
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - fyp_network

  clamav:
    image: clamav/clamav:latest
    container_name: fyp_clamav
    ports:
      - "3310:3310"
    networks:
      - fyp_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: fyp_backend
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      CLAMAV_HOST: clamav
      CLAMAV_PORT: 3310
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - clamav
    networks:
      - fyp_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: fyp_frontend
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: http://backend:3000
    ports:
      - "3001:3001"
    depends_on:
      - backend
    networks:
      - fyp_network

networks:
  fyp_network:
    driver: bridge

volumes:
  postgres_data:
```

---

## 4. TESTING & VALIDATION

### 4.1 Authentication Test Script

**File:** `test-auth.sh`

```bash
#!/bin/bash

API_URL="http://localhost:3000"

echo "🧪 Testing Authentication System..."

# Test 1: Register user
echo "1️⃣ Testing user registration..."
curl -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'

echo -e "\n"

# Test 2: Login
echo "2️⃣ Testing login..."
LOGIN_RESPONSE=$(curl -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }')

echo $LOGIN_RESPONSE

# Extract email for OTP verification
EMAIL="test@example.com"

# Test 3: Verify OTP (manual step - check email)
echo -e "\n3️⃣ Check your email for OTP code"
read -p "Enter OTP code: " OTP

OTP_RESPONSE=$(curl -X POST $API_URL/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"otp\": \"$OTP\"
  }")

echo $OTP_RESPONSE

# Extract token
TOKEN=$(echo $OTP_RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')

echo -e "\n✅ Token: $TOKEN"

# Test 4: Access protected endpoint
echo -e "\n4️⃣ Testing protected endpoint..."
curl -X GET $API_URL/users/me \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n✅ Authentication tests complete!"
```

### 4.2 Manual Testing Checklist

```markdown
## Authentication Testing
- [ ] User registration with valid email/password
- [ ] Login with correct credentials
- [ ] Login with incorrect credentials (should fail)
- [ ] OTP generation and email delivery
- [ ] OTP verification with valid code
- [ ] OTP verification with expired code (after 5 minutes)
- [ ] Account lockout after 5 failed attempts
- [ ] Password reset flow
- [ ] Non-office hours login alert

## Authorization Testing
- [ ] Super admin can access all endpoints
- [ ] Accountant can access financial endpoints only
- [ ] HR can access employee endpoints only
- [ ] Marketing/Sales can access own purchase requests only
- [ ] Unauthorized access returns 403 Forbidden

## File Upload Testing
- [ ] Upload valid file (PDF, JPG, PNG, DOC, DOCX)
- [ ] Upload oversized file (>10MB) - should fail
- [ ] Upload invalid file type - should fail
- [ ] ClamAV malware scanning (test with EICAR test file)
- [ ] File deduplication (upload same file twice)
- [ ] Receipt download with MFA session

## Database Testing
- [ ] User CRUD operations
- [ ] Employee CRUD operations
- [ ] Purchase request creation and approval
- [ ] Claim submission and verification
- [ ] Revenue recording
- [ ] Audit log creation

## Security Testing
- [ ] JWT token validation
- [ ] Expired token rejection
- [ ] CORS policy enforcement
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] Password hashing with Argon2
```

---

## 5. SECURITY CHECKLIST

### 5.1 Production Security Configuration

```markdown
## Environment Variables
- [ ] Change JWT_SECRET to a strong, random value (min 32 characters)
- [ ] Use strong database password
- [ ] Configure email credentials securely
- [ ] Set ADMIN_PASSWORD to a strong password
- [ ] Enable HTTPS in production

## Database Security
- [ ] Enable SSL for PostgreSQL connections
- [ ] Use separate database users with limited privileges
- [ ] Regular database backups
- [ ] Encrypt sensitive data at rest

## Application Security
- [ ] Enable Helmet middleware for security headers
- [ ] Configure rate limiting
- [ ] Implement CSRF protection
- [ ] Enable request validation
- [ ] Sanitize user inputs
- [ ] Disable TypeORM synchronize in production

## File Security
- [ ] ClamAV antivirus running and updated
- [ ] File size limits enforced
- [ ] File type whitelist enforced
- [ ] Files stored in database (BYTEA) not filesystem
- [ ] SHA-256 hash for deduplication

## Monitoring & Logging
- [ ] Setup application monitoring (PM2, DataDog, etc.)
- [ ] Configure error logging
- [ ] Enable audit logging for sensitive actions
- [ ] Setup alerts for suspicious activities
- [ ] Regular security audits

## Network Security
- [ ] Firewall configured (allow only necessary ports)
- [ ] Nginx reverse proxy configured
- [ ] SSL/TLS certificate installed
- [ ] DDoS protection enabled
- [ ] Regular security updates
```

### 5.2 Environment Variables Template

**File:** `backend/.env.production`

```bash
# Application
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-domain.com

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-db-user
DB_PASSWORD=your-strong-password-here
DB_DATABASE=fyp_system

# JWT (Generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-random-string-here

# Email
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password-here

# Admin Account
ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=YourStrongPassword123!

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.jpg,.jpeg,.png,.pdf,.doc,.docx

# ClamAV
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
```

---

## 6. CONCLUSION & SUMMARY

### System Capabilities

✅ **Implemented Features:**
- Multi-factor authentication (Email OTP)
- Argon2 password hashing
- JWT token-based authentication
- Role-based access control (5 roles)
- Account lockout protection
- File upload with malware scanning
- File deduplication (SHA-256)
- Non-office hours alerts
- Purchase request workflow
- Claims management
- Employee management
- Revenue tracking
- Announcements system
- Partial audit logging

### Architecture Strengths
- **Zero Trust Principles:** Verify every request, least privilege access
- **Layered Security:** Multiple validation layers for file uploads
- **Scalability:** Modular architecture, can scale horizontally
- **Maintainability:** Clear separation of concerns, TypeScript type safety
- **Production-Ready:** PM2 process management, Nginx reverse proxy

### Recommended Next Steps
1. **Implement comprehensive audit logging** across all modules
2. **Add session timeout** and inactivity detection
3. **Implement refresh tokens** for better security
4. **Add CSRF protection** for form submissions
5. **Enable email verification** for new accounts
6. **Implement advanced monitoring** with real-time alerts
7. **Add unit and integration tests** for critical paths
8. **Setup CI/CD pipeline** for automated deployments

---

**END OF SAMPLE CODE IMPLEMENTATION**

**All 4 Parts Created:**
1. Core Architecture & Authentication
2. RBAC, Guards & API Security
3. File Security & Frontend
4. Dashboard, Business Logic & Deployment

**Total Documentation:** Complete end-to-end implementation guide for Zero Trust Access Control System
