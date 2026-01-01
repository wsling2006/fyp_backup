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
  // Financial tracking fields for multiple claims
  total_claimed?: number;
  total_paid?: number;
  total_rejected?: number;
  payment_progress?: number;
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
  const { user, logout, isInitialized } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showViewClaimsModal, setShowViewClaimsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [deleteConfirmRequest, setDeleteConfirmRequest] = useState<string | null>(null);

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
      console.log('[loadRequests] Loaded', response.data.length, 'requests');
      response.data.forEach((req: PurchaseRequest, idx: number) => {
        console.log(`[loadRequests] Request ${idx + 1}: ${req.id.slice(0,8)} - Status: ${req.status}, Claims: ${req.claims?.length || 0}`);
      });
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
    // Allow upload for APPROVED and PARTIALLY_PAID requests (user can add more claims)
    if (!['APPROVED', 'PARTIALLY_PAID'].includes(request.status)) {
      console.log('[canUploadClaim] Status check failed:', request.status);
      return false;
    }
    
    // Check ownership - handle both userId and id properties
    const currentUserId = user?.userId || user?.id;
    const isOwner = request.created_by_user_id === currentUserId;
    
    console.log('[canUploadClaim] Checking permissions:', {
      requestId: request.id.slice(0, 8),
      status: request.status,
      requestOwnerId: request.created_by_user_id,
      currentUserId: currentUserId,
      userRole: user?.role,
      isOwner,
    });
    
    // User must be in allowed roles AND (be owner OR be super_admin)
    const hasRole = user?.role === 'sales_department' || user?.role === 'marketing' || user?.role === 'super_admin';
    const canUpload = hasRole && (isOwner || user?.role === 'super_admin');
    
    console.log('[canUploadClaim] Result:', { hasRole, isOwner, canUpload });
    
    return canUpload;
  };

  const canEditRequest = (request: PurchaseRequest) => {
    // Only owner or super_admin can edit
    const isOwner = request.created_by_user_id === user?.userId || request.created_by_user_id === user?.id;
    if (!isOwner && user?.role !== 'super_admin') return false;
    
    // Can only edit DRAFT or SUBMITTED status
    return ['DRAFT', 'SUBMITTED'].includes(request.status);
  };

  const canEditClaim = (claim: any) => {
    // Only owner or super_admin can edit
    const isOwner = claim.uploaded_by_user_id === user?.userId || claim.uploaded_by_user_id === user?.id;
    if (!isOwner && user?.role !== 'super_admin') return false;
    
    // Can only edit PENDING status
    return claim.status === 'PENDING';
  };

  const canDeleteRequest = (request: PurchaseRequest) => {
    // Only accountant or super_admin can delete
    if (user?.role !== 'accountant' && user?.role !== 'super_admin') {
      console.log(`[canDeleteRequest] User role ${user?.role} - NOT AUTHORIZED`);
      return false;
    }
    
    // Can delete DRAFT, SUBMITTED, or REJECTED (no active workflow)
    if (['DRAFT', 'SUBMITTED', 'REJECTED'].includes(request.status)) {
      console.log(`[canDeleteRequest] Request ${request.id.slice(0,8)} - ${request.status} - CAN DELETE`);
      return true;
    }
    
    // Can delete APPROVED requests IF no claims exist
    if (request.status === 'APPROVED' && (!request.claims || request.claims.length === 0)) {
      console.log(`[canDeleteRequest] Request ${request.id.slice(0,8)} - APPROVED with ${request.claims?.length || 0} claims - CAN DELETE`);
      return true;
    }
    
    // Can delete PAID requests directly (no need to delete claims first)
    if (request.status === 'PAID') {
      console.log(`[canDeleteRequest] Request ${request.id.slice(0,8)} - PAID - CAN DELETE DIRECTLY`);
      return true;
    }
    
    // CANNOT delete PARTIALLY_PAID requests (user can still add more claims)
    if (request.status === 'PARTIALLY_PAID') {
      console.log(`[canDeleteRequest] Request ${request.id.slice(0,8)} - PARTIALLY_PAID - CANNOT DELETE (can still add claims)`);
      return false;
    }
    
    console.log(`[canDeleteRequest] Request ${request.id.slice(0,8)} - Status: ${request.status}, Claims: ${request.claims?.length || 0} - CANNOT DELETE`);
    return false;
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      setError(null);
      await api.delete(`/purchase-requests/${requestId}`);
      setDeleteConfirmRequest(null);
      // Reload requests
      await loadRequests();
    } catch (err: any) {
      console.error('Failed to delete purchase request:', err);
      setError(err.response?.data?.message || 'Failed to delete purchase request');
      setDeleteConfirmRequest(null);
    }
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
      PARTIALLY_PAID: 'bg-orange-100 text-orange-800', // NEW: Orange for partial payment
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
                      
                      {/* Payment Progress for PARTIALLY_PAID or PAID status */}
                      {(request.status === 'PARTIALLY_PAID' || request.status === 'PAID') && request.payment_progress !== undefined && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Payment Progress</span>
                            <span className="text-sm font-semibold text-blue-800">{request.payment_progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                            <div 
                              className={`h-2.5 rounded-full ${request.status === 'PAID' ? 'bg-green-600' : 'bg-orange-500'}`}
                              style={{ width: `${Math.min(request.payment_progress || 0, 100)}%` }}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="text-gray-500">Paid:</span>
                              <p className="font-semibold text-green-600">${formatCurrency(request.total_paid || 0)}</p>
                            </div>
                            {(request.total_rejected || 0) > 0 && (
                              <div>
                                <span className="text-gray-500">Rejected:</span>
                                <p className="font-semibold text-red-600">${formatCurrency(request.total_rejected)}</p>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-500">Approved:</span>
                              <p className="font-semibold text-gray-900">${formatCurrency(request.approved_amount)}</p>
                            </div>
                          </div>
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
                        <button
                          onClick={async () => {
                            console.log('[CLAIMS BUTTON CLICKED]', request.claims);
                            
                            // Accountants should always see the modal (to access delete button)
                            const isAccountant = user?.role === 'accountant' || user?.role === 'super_admin';
                            
                            // If accountant OR multiple claims, open VIEW modal
                            if (isAccountant || request.claims.length > 1) {
                              setSelectedRequest(request);
                              setShowViewClaimsModal(true);
                              return;
                            }
                            
                            // Otherwise, download directly (single claim, non-accountant)
                            try {
                              const claim = request.claims[0];
                              console.log('[DOWNLOADING CLAIM]', claim.id, 'Filename:', claim.receipt_file_original_name);
                              
                              // Use api client to download with authentication
                              const response = await api.get(`/purchase-requests/claims/${claim.id}/download`, {
                                responseType: 'blob',
                              });
                              
                              console.log('[DOWNLOAD RESPONSE]', {
                                status: response.status,
                                contentType: response.headers['content-type'],
                                blobSize: response.data.size,
                                blobType: response.data.type
                              });
                              
                              // Verify blob is not empty
                              if (!response.data || response.data.size === 0) {
                                throw new Error('Downloaded file is empty');
                              }
                              
                              // Create blob with correct MIME type and trigger download
                              const blob = response.data; // Use response blob directly
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = claim.receipt_file_original_name || 'receipt.pdf';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                              
                              console.log('[DOWNLOAD SUCCESS]', `File: ${claim.receipt_file_original_name}, Size: ${blob.size} bytes`);
                              alert(`Successfully downloaded: ${claim.receipt_file_original_name}`);
                            } catch (error: any) {
                              console.error('[DOWNLOAD ERROR]', error);
                              alert(`Failed to download receipt: ${error.message}`);
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap font-bold"
                          title={
                            user?.role === 'accountant' || user?.role === 'super_admin'
                              ? "Click to view claims and manage"
                              : request.claims.length === 1
                              ? "Click to download receipt"
                              : "Click to view all claims"
                          }
                        >
                          {user?.role === 'accountant' || user?.role === 'super_admin'
                            ? `VIEW ${request.claims.length} CLAIM(S)`
                            : `DOWNLOAD ${request.claims.length} CLAIM(S)`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Delete button for purchase requests (Accountant/Super Admin only) */}
                  {canDeleteRequest(request) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {deleteConfirmRequest === request.id ? (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-700 font-medium">
                            Are you sure you want to delete this purchase request?
                            {request.status === 'PAID' && request.claims.length > 0 && (
                              <span className="text-blue-600 block text-xs mt-1">
                                ℹ️ All {request.claims.length} claim(s) will be deleted automatically
                              </span>
                            )}
                            {request.status === 'APPROVED' && request.claims.length > 0 && (
                              <span className="text-red-600 block text-xs mt-1">
                                ⚠️ All {request.claims.length} claim(s) will be deleted automatically
                              </span>
                            )}
                          </p>
                          <button
                            onClick={() => handleDeleteRequest(request.id)}
                            className="px-3 py-1 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors text-sm"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmRequest(null)}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmRequest(request.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v1a1 1 0 001 1h1v10a2 2 0 002 2h8a2 2 0 002-2V7h1a1 1 0 001-1V6a2 2 0 00-2-2h-1V3a1 1 0 00-1-1H6zm8 2H6v2h8V4zm-8 4h8v10H6V8z" clipRule="evenodd" />
                          </svg>
                          Delete Purchase Request
                        </button>
                      )}
                    </div>
                  )}
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

        {showViewClaimsModal && selectedRequest && (
          <ViewClaimsModal
            request={selectedRequest}
            onClose={() => {
              setShowViewClaimsModal(false);
              setSelectedRequest(null);
              loadRequests(); // Reload to get updated claims list
            }}
            onClaimChanged={async () => {
              console.log('[onClaimChanged] Reloading purchase requests...');
              // Reload requests list immediately
              await loadRequests();
              console.log('[onClaimChanged] Purchase requests reloaded');
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
  // OTP flow removed: Users can now upload claims without OTP verification
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    vendor_name: '',
    amount_claimed: request.approved_amount?.toString() || '',
    purchase_date: new Date().toISOString().split('T')[0],
    claim_description: '',
  });

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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Receipt & Submit Claim</h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-800 text-sm">
            💡 <strong>Tip:</strong> You can submit multiple claims for this purchase request. Each claim should have one receipt file.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">{request.title}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div>
              <span className="text-gray-500">Approved Amount:</span>
              <p className="font-medium text-green-600">${formatCurrency(request.approved_amount)}</p>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <p className="font-medium">{request.status}</p>
            </div>
          </div>
          
          {request.claims && request.claims.length > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                📋 <strong>{request.claims.length} claim(s) already submitted.</strong> You can add more claims if needed.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

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
            {request.claims && request.claims.length > 0 ? (
              (() => {
                const totalClaimed = request.claims.reduce((sum: number, claim: any) => sum + Number(claim.amount_claimed || 0), 0);
                const remaining = Number(request.approved_amount) - totalClaimed;
                return (
                  <p className="text-xs text-gray-500 mt-1">
                    Total approved: ${formatCurrency(request.approved_amount)} | 
                    Already claimed: ${formatCurrency(totalClaimed)} | 
                    <span className="font-semibold text-green-600"> Remaining: ${formatCurrency(remaining)}</span>
                  </p>
                );
              })()
            ) : (
              <p className="text-xs text-gray-500 mt-1">Must not exceed approved amount: ${formatCurrency(request.approved_amount)}</p>
            )}
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

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !file || !formData.vendor_name || !formData.amount_claimed || !formData.claim_description}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Uploading...' : 'Submit Claim'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// View Claims Modal Component
function ViewClaimsModal({
  request,
  onClose,
  onClaimChanged,
}: {
  request: PurchaseRequest;
  onClose: () => void;
  onClaimChanged?: () => void;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [verifyModal, setVerifyModal] = useState<{ claimId: string; action: 'REJECTED' | 'PROCESSED' } | null>(null);
  const [otpPassword, setOtpPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);

  useEffect(() => {
    loadClaims();
  }, [request.id]);

  const loadClaims = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch detailed claim data
      const claimPromises = request.claims.map(claim => 
        api.get(`/purchase-requests/claims/${claim.id || claim}`)
      );
      const responses = await Promise.all(claimPromises);
      setClaims(responses.map(r => r.data));
    } catch (err: any) {
      console.error('Failed to load claims:', err);
      setError(err.response?.data?.message || 'Failed to load claim details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (claimId: string, filename: string) => {
    try {
      const response = await api.get(`/purchase-requests/claims/${claimId}/download`, {
        responseType: 'blob',
      });
      
      // Create a blob URL and trigger download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download receipt:', err);
      alert(err.response?.data?.message || 'Failed to download receipt file');
    }
  };

  const handleDelete = async (claimId: string) => {
    try {
      setError(null);
      setSuccess(null);
      await api.delete(`/purchase-requests/claims/${claimId}`);
      setSuccess('Claim deleted successfully');
      setDeleteConfirm(null);
      // Reload claims in modal
      await loadClaims();
      // Notify parent to reload purchase requests (updates delete button visibility)
      if (onClaimChanged) {
        onClaimChanged();
      }
    } catch (err: any) {
      console.error('Failed to delete claim:', err);
      setError(err.response?.data?.message || 'Failed to delete claim');
      setDeleteConfirm(null);
    }
  };

  const handleRequestOtp = async () => {
    try {
      setError(null);
      await api.post('/purchase-requests/request-otp/verify-claim', {
        password: otpPassword,
      });
      setSuccess('OTP sent to your email');
      setOtpRequested(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to request OTP');
    }
  };

  const handleVerifyClaim = async () => {
    if (!verifyModal) return;
    
    try {
      setError(null);
      setLoading(true);
      await api.put(`/purchase-requests/claims/${verifyModal.claimId}/verify`, {
        status: verifyModal.action,
        verification_notes: verificationNotes,
        otp: otp,
      });
      setSuccess(`Claim ${verifyModal.action.toLowerCase()} successfully`);
      setVerifyModal(null);
      setOtp('');
      setOtpPassword('');
      setVerificationNotes('');
      setOtpRequested(false);
      // Reload claims in modal
      await loadClaims();
      // Notify parent to reload purchase requests
      if (onClaimChanged) {
        onClaimChanged();
      }
    } catch (err: any) {
      console.error('Failed to verify claim:', err);
      setError(err.response?.data?.message || 'Failed to verify claim');
    } finally {
      setLoading(false);
    }
  };

  // Check if user can delete claims (accountant or super_admin)
  const canDeleteClaim = () => {
    const canDelete = user?.role === 'accountant' || user?.role === 'super_admin';
    console.log('[Delete Claim] canDelete:', canDelete, 'user role:', user?.role);
    return canDelete;
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: { [key: string]: string } = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      VERIFIED: 'bg-blue-100 text-blue-800',
      PROCESSED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Claims for Purchase Request: {request.title}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {claims.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No claims found for this purchase request.
              </div>
            ) : (
              claims.map((claim) => (
                <div key={claim.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  {console.log('[Claim]', claim.id.slice(0,8), 'Status:', claim.status, 'canDelete:', canDeleteClaim(), 'showButton:', canDeleteClaim() && claim.status === 'VERIFIED')}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">Claim #{claim.id.slice(0, 8)}</h3>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadgeColor(claim.status)}`}>
                        {claim.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Vendor:</span>
                      <p className="font-medium text-gray-900">{claim.vendor_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Amount Claimed:</span>
                      <p className="font-medium text-green-600 text-lg">${formatCurrency(claim.amount_claimed)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Purchase Date:</span>
                      <p className="font-medium text-gray-900">{new Date(claim.purchase_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Uploaded:</span>
                      <p className="font-medium text-gray-900">{new Date(claim.uploaded_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Uploaded By:</span>
                      <p className="font-medium text-gray-900">{claim.uploadedBy?.email || 'N/A'}</p>
                    </div>
                    {claim.verifiedBy && (
                      <div>
                        <span className="text-gray-500">Verified By:</span>
                        <p className="font-medium text-gray-900">{claim.verifiedBy.email}</p>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-gray-500">Description:</span>
                    <p className="font-medium text-gray-900 mt-1">{claim.claim_description}</p>
                  </div>

                  {claim.verification_notes && (
                    <div className="p-3 bg-blue-50 rounded-lg mb-4">
                      <span className="text-sm font-medium text-blue-900">Verification Notes:</span>
                      <p className="text-sm text-blue-800 mt-1">{claim.verification_notes}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                    <div className="flex-1">
                      <span className="text-gray-500 text-sm">Receipt File:</span>
                      <p className="font-medium text-gray-900">{claim.receipt_file_original_name}</p>
                    </div>
                    <button
                      onClick={() => handleDownload(claim.id, claim.receipt_file_original_name)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Download Receipt
                    </button>
                  </div>

                  {/* Process/Reject buttons for PENDING claims (Accountants only) */}
                  {canDeleteClaim() && claim.status === 'PENDING' && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-3">Review this claim:</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setVerifyModal({ claimId: claim.id, action: 'PROCESSED' })}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                          </svg>
                          Approve & Process
                        </button>
                        <button
                          onClick={() => setVerifyModal({ claimId: claim.id, action: 'REJECTED' })}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delete button for all claims (accountant/super_admin can delete any claim) */}
                  {canDeleteClaim() && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => setDeleteConfirm(claim.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v1a1 1 0 001 1h1v10a2 2 0 002 2h8a2 2 0 002-2V7h1a1 1 0 001-1V6a2 2 0 00-2-2h-1V3a1 1 0 00-1-1H6zm8 2H6v2h8V4zm-8 4h8v10H6V8z" clipRule="evenodd" />
                        </svg>
                        Delete Claim
                      </button>

                      {deleteConfirm === claim.id && (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-500">Are you sure?</p>
                          <button
                            onClick={() => handleDelete(claim.id)}
                            className="px-3 py-1 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-colors text-sm"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Verification Modal */}
      {verifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {verifyModal.action === 'PROCESSED' && 'Approve & Process Claim'}
              {verifyModal.action === 'REJECTED' && 'Reject Claim'}
            </h3>

            {!otpRequested ? (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Enter your password to receive an OTP for verification:
                </p>
                <input
                  type="password"
                  value={otpPassword}
                  onChange={(e) => setOtpPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setVerifyModal(null);
                      setOtpPassword('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestOtp}
                    disabled={!otpPassword}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Request OTP
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Enter the OTP sent to your email:
                </p>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
                />
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="Verification notes (optional)"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setVerifyModal(null);
                      setOtp('');
                      setOtpPassword('');
                      setVerificationNotes('');
                      setOtpRequested(false);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyClaim}
                    disabled={!otp || loading}
                    className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                      verifyModal.action === 'PROCESSED' ? 'bg-blue-600 hover:bg-blue-700' :
                      'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {loading ? 'Processing...' : `Confirm ${verifyModal.action}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
