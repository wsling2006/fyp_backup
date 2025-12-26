'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';


// Helper function to safely format decimal values (PostgreSQL returns DECIMAL as string)
const formatCurrency = (value: any): string => {
  if (value === null || value === undefined) return '0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? '0.00' : num.toFixed(2);
};
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDepartment, setFilterDepartment] = useState('ALL');

  useEffect(() => {
    // Wait for AuthContext to initialize (load from localStorage)
    if (!isInitialized) {
      return;
    }

    // After initialization, check if user is logged in
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user has access to purchase requests
    const allowedRoles = ['sales_department', 'marketing', 'accountant', 'super_admin'];
    if (!allowedRoles.includes(user.role)) {
      router.push('/dashboard');
      return;
    }

    loadRequests();
  }, [isInitialized, user, router]);

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

  const canCreateRequest = () => {
    return user?.role === 'sales_department' || user?.role === 'marketing' || user?.role === 'super_admin';
  };

  const canReviewRequest = () => {
    return user?.role === 'accountant' || user?.role === 'super_admin';
  };

  const canUploadClaim = (request: PurchaseRequest) => {
    if (request.status !== 'APPROVED') return false;
    const isOwner = request.created_by_user_id === user?.userId;
    return (user?.role === 'sales_department' || user?.role === 'marketing' || user?.role === 'super_admin') && (isOwner || user?.role === 'super_admin');
  };

  const filteredRequests = requests.filter((req) => {
    if (filterStatus !== 'ALL' && req.status !== filterStatus) return false;
    if (filterDepartment !== 'ALL' && req.department !== filterDepartment) return false;
    return true;
  });

  const getStatusBadgeColor = (status: string) => {
    const colors: { [key: string]: string } = {
      DRAFT: 'bg-gray-100 text-gray-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PAID: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: number) => {
    const badges: { [key: number]: { label: string; color: string } } = {
      1: { label: 'Normal', color: 'bg-gray-100 text-gray-800' },
      2: { label: 'Medium', color: 'bg-blue-100 text-blue-800' },
      3: { label: 'High', color: 'bg-yellow-100 text-yellow-800' },
      4: { label: 'Very High', color: 'bg-orange-100 text-orange-800' },
      5: { label: 'Urgent', color: 'bg-red-100 text-red-800' },
    };
    return badges[priority] || badges[1];
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Purchase Requests</h1>
              <p className="text-gray-600 mt-1">
                {user?.role === 'accountant' || user?.role === 'super_admin'
                  ? 'Manage all purchase requests and claims'
                  : 'Create and track your purchase requests'}
              </p>
            </div>
            {canCreateRequest() && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Request
              </button>
            )}
          </div>

          <div className="mt-6 flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Departments</option>
                <option value="sales_department">Sales</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Purchase Requests</h3>
              <p className="text-gray-600">
                {canCreateRequest() ? 'Create your first purchase request to get started.' : 'No requests to display.'}
              </p>
            </div>
          ) : (
            filteredRequests.map((request) => {
              const priorityBadge = getPriorityBadge(request.priority);
              return (
                <div key={request.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(request.status)}`}>
                          {request.status}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityBadge.color}`}>
                          {priorityBadge.label}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{request.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Department:</span>
                          <p className="font-medium text-gray-900">{request.department === 'sales_department' ? 'Sales' : 'Marketing'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Estimated Amount:</span>
                          <p className="font-medium text-gray-900">${formatCurrency(request.estimated_amount)}</p>
                        </div>
                        {request.approved_amount && (
                          <div>
                            <span className="text-gray-500">Approved Amount:</span>
                            <p className="font-medium text-green-600">${formatCurrency(request.approved_amount)}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Created:</span>
                          <p className="font-medium text-gray-900">{new Date(request.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {request.review_notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Review Notes:</span> {request.review_notes}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      {canReviewRequest() && (request.status === 'SUBMITTED' || request.status === 'UNDER_REVIEW') && (
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowReviewModal(true);
                          }}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
                        >
                          Review
                        </button>
                      )}
                      {canUploadClaim(request) && (
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowClaimModal(true);
                          }}
                          className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
                        >
                          Upload Claim
                        </button>
                      )}
                      {request.claims.length > 0 && (
                        <span className="px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg text-center">
                          {request.claims.length} Claim(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {showCreateModal && (
          <CreateRequestModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              loadRequests();
            }}
            userRole={user?.role || ''}
          />
        )}

        {showReviewModal && selectedRequest && (
          <ReviewRequestModal
            request={selectedRequest}
            onClose={() => {
              setShowReviewModal(false);
              setSelectedRequest(null);
            }}
            onSuccess={() => {
              setShowReviewModal(false);
              setSelectedRequest(null);
              loadRequests();
            }}
          />
        )}

        {showClaimModal && selectedRequest && (
          <UploadClaimModal
            request={selectedRequest}
            onClose={() => {
              setShowClaimModal(false);
              setSelectedRequest(null);
            }}
            onSuccess={() => {
              setShowClaimModal(false);
              setSelectedRequest(null);
              loadRequests();
            }}
          />
        )}
      </div>
    </div>
  );
}

function CreateRequestModal({
  onClose,
  onSuccess,
  userRole,
}: {
  onClose: () => void;
  onSuccess: () => void;
  userRole: string;
}) {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: userRole === 'sales_department' ? 'sales_department' : 'marketing',
    priority: 1,
    estimated_amount: '',
    password: '',
    otp: '',
  });

  const requestOtp = async () => {
    if (!formData.password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.post('/purchase-requests/request-otp/create', {
        password: formData.password,
      });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      await api.post('/purchase-requests', {
        title: formData.title,
        description: formData.description,
        department: formData.department,
        priority: formData.priority,
        estimated_amount: parseFloat(formData.estimated_amount),
        otp: formData.otp,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create purchase request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Create Purchase Request</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {step === 'form' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Office Supplies for Q1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Describe what you need to purchase and why..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={userRole !== 'super_admin'}
              >
                <option value="sales_department">Sales</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 - Normal</option>
                <option value={2}>2 - Medium</option>
                <option value={3}>3 - High</option>
                <option value={4}>4 - Very High</option>
                <option value={5}>5 - Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Amount ($) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.estimated_amount}
                onChange={(e) => setFormData({ ...formData, estimated_amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-3">To create this request, you need to verify your identity with OTP.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={requestOtp}
                disabled={loading || !formData.title || !formData.description || !formData.estimated_amount || !formData.password}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending OTP...' : 'Request OTP'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                ✉️ An OTP code has been sent to your registered email. Please check your inbox and enter the code below.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code *</label>
              <input
                type="text"
                value={formData.otp}
                onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">The OTP code expires in 5 minutes.</p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('form')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.otp || formData.otp.length !== 6}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewRequestModal({
  request,
  onClose,
  onSuccess,
}: {
  request: PurchaseRequest;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    status: 'APPROVED',
    review_notes: '',
    approved_amount: request.estimated_amount.toString(),
    password: '',
    otp: '',
  });

  const requestOtp = async () => {
    if (!formData.password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.post('/purchase-requests/request-otp/review', {
        password: formData.password,
      });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      await api.put(`/purchase-requests/${request.id}/review`, {
        status: formData.status,
        review_notes: formData.review_notes || undefined,
        approved_amount: formData.status === 'APPROVED' ? parseFloat(formData.approved_amount) : undefined,
        otp: formData.otp,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to review purchase request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Review Purchase Request</h2>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">{request.title}</h3>
          <p className="text-sm text-gray-600 mb-3">{request.description}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Department:</span>
              <p className="font-medium">{request.department === 'sales_department' ? 'Sales' : 'Marketing'}</p>
            </div>
            <div>
              <span className="text-gray-500">Estimated Amount:</span>
              <p className="font-medium">${formatCurrency(request.estimated_amount)}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {step === 'form' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Decision *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="APPROVED">✅ Approve</option>
                <option value="UNDER_REVIEW">⏳ Under Review (Request More Info)</option>
                <option value="REJECTED">❌ Reject</option>
              </select>
            </div>

            {formData.status === 'APPROVED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approved Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.approved_amount}
                  onChange={(e) => setFormData({ ...formData, approved_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  max={request.estimated_amount}
                />
                <p className="text-xs text-gray-500 mt-1">Must not exceed estimated amount: ${formatCurrency(request.estimated_amount)}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Notes</label>
              <textarea
                value={formData.review_notes}
                onChange={(e) => setFormData({ ...formData, review_notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add any comments or notes about your decision..."
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-3">To submit your review, you need to verify your identity with OTP.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={requestOtp}
                disabled={loading || !formData.password}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending OTP...' : 'Request OTP'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                ✉️ An OTP code has been sent to your registered email. Please check your inbox and enter the code below.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code *</label>
              <input
                type="text"
                value={formData.otp}
                onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('form')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.otp || formData.otp.length !== 6}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UploadClaimModal({
  request,
  onClose,
  onSuccess,
}: {
  request: PurchaseRequest;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    vendor_name: '',
    amount_claimed: request.approved_amount?.toString() || '',
    purchase_date: new Date().toISOString().split('T')[0],
    claim_description: '',
    password: '',
    otp: '',
  });

  const requestOtp = async () => {
    if (!formData.password) {
      setError('Please enter your password');
      return;
    }
    if (!file) {
      setError('Please select a receipt file');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.post('/purchase-requests/request-otp/upload-receipt', {
        password: formData.password,
      });
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a receipt file');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const uploadData = new FormData();
      uploadData.append('receipt', file);
      uploadData.append('purchase_request_id', request.id);
      uploadData.append('vendor_name', formData.vendor_name);
      uploadData.append('amount_claimed', formData.amount_claimed);
      uploadData.append('purchase_date', formData.purchase_date);
      uploadData.append('claim_description', formData.claim_description);
      uploadData.append('otp', formData.otp);

      await api.post('/purchase-requests/claims/upload', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Receipt & Submit Claim</h2>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">{request.title}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Approved Amount:</span>
              <p className="font-medium text-green-600">${formatCurrency(request.approved_amount)}</p>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <p className="font-medium">{request.status}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {step === 'form' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt File (PDF/JPG/PNG, max 10MB) *</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {file && (
                <p className="text-sm text-green-600 mt-1">✓ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
              <input
                type="text"
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., ABC Supplies Inc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Claimed ($) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount_claimed}
                onChange={(e) => setFormData({ ...formData, amount_claimed: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                max={request.approved_amount || undefined}
              />
              <p className="text-xs text-gray-500 mt-1">Must not exceed approved amount: ${formatCurrency(request.approved_amount)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date *</label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Claim Description *</label>
              <textarea
                value={formData.claim_description}
                onChange={(e) => setFormData({ ...formData, claim_description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe what was purchased..."
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-3">To submit this claim, you need to verify your identity with OTP.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={requestOtp}
                disabled={loading || !file || !formData.vendor_name || !formData.amount_claimed || !formData.claim_description || !formData.password}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending OTP...' : 'Request OTP'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                ✉️ An OTP code has been sent to your registered email. Please check your inbox and enter the code below.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OTP Code *</label>
              <input
                type="text"
                value={formData.otp}
                onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep('form')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.otp || formData.otp.length !== 6}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Uploading...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
