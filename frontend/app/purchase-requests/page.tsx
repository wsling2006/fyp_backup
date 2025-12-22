'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

interface PurchaseRequest {
  id: string;
  title: string;
  description: string;
  department: string;
  priority: number;
  estimated_amount: number;
  approved_amount: number | null;
  status: string;
  created_by_user_id: string;
  reviewed_by_user_id: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  createdBy: {
    id: string;
    email: string;
    role: string;
  };
  reviewedBy: {
    id: string;
    email: string;
    role: string;
  } | null;
  claims: any[];
}

export default function PurchaseRequestsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const allowedRoles = ['sales_department', 'marketing', 'accountant', 'super_admin'];
    if (!allowedRoles.includes(user.role)) {
      router.push('/dashboard');
      return;
    }

    loadRequests();
  }, [user, router]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/purchase-requests');
      setRequests(response.data);
    } catch (err: any) {
      console.error('Failed to load purchase requests:', err);
      setError(err.response?.data?.message || 'Failed to load purchase requests');
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Purchase Requests</h1>
          <p className="text-gray-600 mt-1">
            {user?.role === 'accountant' || user?.role === 'super_admin'
              ? 'Manage all purchase requests and claims'
              : 'Create and track your purchase requests'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Purchase Request System</h3>
          <p className="text-gray-600 mb-4">
            The purchase request and claim system is currently under development.
          </p>
          <p className="text-sm text-gray-500">
            Features include: Request OTP creation, accountant review with MFA, receipt upload with ClamAV scanning.
          </p>
        </div>
      </div>
    </div>
  );
}
