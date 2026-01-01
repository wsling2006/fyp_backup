'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loader from '@/components/ui/Loader';

interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  emergency_contact: string | null;
  ic_number: string | null;
  birthday: string | null;
  bank_account_number: string | null;
  position: string | null;
  department: string | null;
  date_of_joining: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
  created_at: string;
  updated_at: string;
}

interface EmployeeDocument {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  document_type: string;
  description: string | null;
  uploaded_by: {
    id: string;
    email: string;
  };
  created_at: string;
}

export default function EmployeeDetailPage() {
  const { user, logout, isInitialized } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const employeeId = params?.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'human_resources' && user.role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }

    if (employeeId) {
      // Check if this is a post-update refresh (should use silent mode)
      const refreshParam = searchParams?.get('refresh');
      const useSilentMode = refreshParam === 'silent';
      
      // DON'T check sessionStorage here - let the backend decide
      // Backend has the authoritative in-memory Map
      // SessionStorage is only for sending ?silent=true AFTER first successful load
      
      loadEmployeeDetails(useSilentMode);
      loadEmployeeDocuments();
    }
  }, [isInitialized, user, router, employeeId]);

  /**
   * Load employee details with optional silent mode
   * 
   * @param silent - If true, adds ?silent=true to skip audit logging
   * 
   * Pattern:
   * - First load: silent=false (backend creates audit log if not in Map)
   * - Page refresh: Uses browser navigation (backend checks Map, skips log)
   * - After update: ?refresh=silent (prevents duplicate log after update)
   * 
   * The backend's in-memory Map is the source of truth for spam prevention.
   * Frontend just passes silent=true for specific cases (like post-update refresh).
   */
  const loadEmployeeDetails = async (silent: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build URL with optional silent parameter
      const url = silent 
        ? `/hr/employees/${employeeId}?silent=true`
        : `/hr/employees/${employeeId}`;
      
      const response = await api.get(url);
      console.log(`[HR] Loaded employee details (silent=${silent})`);
      setEmployee(response.data?.employee || response.data);
      
      // No need to manage sessionStorage - backend handles spam prevention
    } catch (err: any) {
      console.error('[HR] Failed to load employee:', err);
      setError(err.response?.data?.message || 'Failed to load employee details');
      
      if (err.response?.status === 401) {
        logout();
      } else if (err.response?.status === 403) {
        setError('Access denied. HR permissions required.');
      } else if (err.response?.status === 404) {
        setError('Employee not found.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const response = await api.get(`/hr/employees/${employeeId}/documents`);
      const docs = response.data?.documents || [];
      console.log('[HR] Loaded employee documents:', docs.length);
      setDocuments(docs);
    } catch (err: any) {
      console.error('[HR] Failed to load documents:', err);
      // Set empty array on error to prevent crash
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleDownloadDocument = async (documentId: string, filename: string) => {
    try {
      console.log('[HR] Downloading document:', documentId);
      const response = await api.get(
        `/hr/employees/${employeeId}/documents/${documentId}/download`,
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      console.log('[HR] Document downloaded successfully');
    } catch (err: any) {
      console.error('[HR] Failed to download document:', err);
      alert(err.response?.data?.message || 'Failed to download document');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'INACTIVE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'TERMINATED':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <Loader />
          <p className="text-gray-600 mt-4 text-lg">Loading employee details...</p>
        </div>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-l-4 border-red-500 bg-red-50">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">⚠️</span>
              <div>
                <h3 className="font-semibold text-red-900 text-xl">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
            <Button variant="primary" onClick={() => router.push('/hr/employees')} className="w-auto">
              ← Back to Employee List
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!employee) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button
              variant="outline"
              onClick={() => router.push('/hr/employees')}
              className="w-auto mb-4 px-4 py-2"
            >
              ← Back to Employee List
            </Button>
            <h1 className="text-4xl font-bold text-gray-900">{employee.name}</h1>
            <p className="text-gray-600 mt-1">
              Employee ID: {employee.employee_id || 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border ${getStatusBadgeColor(
                employee.status
              )}`}
            >
              {employee.status}
            </span>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(true)}
              className="w-auto px-6 py-2 flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <span>🗑️</span>
              Delete Employee
            </Button>
            <Button
              variant="primary"
              onClick={() => router.push(`/hr/employees/${employeeId}/edit`)}
              className="w-auto px-6 py-2 flex items-center gap-2"
            >
              <span>✏️</span>
              Edit Employee
            </Button>
          </div>
        </div>

        {/* Personal Information Card */}
        <Card variant="gradient" className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">👤</span>
            Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Full Name
              </label>
              <p className="text-white text-lg">{employee.name}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Email
              </label>
              <p className="text-white text-lg">{employee.email}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Phone Number
              </label>
              <p className="text-white text-lg">{employee.phone || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Birthday
              </label>
              <p className="text-white text-lg">{formatDate(employee.birthday)}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Address
              </label>
              <p className="text-white text-lg">{employee.address || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Emergency Contact
              </label>
              <p className="text-white text-lg">{employee.emergency_contact || 'N/A'}</p>
            </div>
          </div>
        </Card>

        {/* Sensitive Information Card */}
        <Card variant="glass" className="mb-6 border-l-4 border-amber-500">
          <div className="flex items-start mb-4">
            <span className="text-2xl mr-2">🔒</span>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">Sensitive Information</h2>
              <p className="text-sm text-amber-300 mt-1">
                ⚠️ Access to this information is logged for audit purposes
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                IC Number / Passport
              </label>
              <p className="text-white text-lg font-mono bg-gray-700/50 px-3 py-2 rounded border border-gray-600">
                {employee.ic_number || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Bank Account Number
              </label>
              <p className="text-white text-lg font-mono bg-gray-700/50 px-3 py-2 rounded border border-gray-600">
                {employee.bank_account_number || 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        {/* Employment Information Card */}
        <Card variant="gradient" className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
            <span className="mr-2">💼</span>
            Employment Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Position
              </label>
              <p className="text-white text-lg">{employee.position || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Department
              </label>
              <p className="text-white text-lg">{employee.department || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Date of Joining
              </label>
              <p className="text-white text-lg">{formatDate(employee.date_of_joining)}</p>
            </div>
          </div>
        </Card>

        {/* Employee Documents Section */}
        <Card variant="gradient" className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <span className="mr-2">📄</span>
              Employee Documents
            </h2>
            <Button
              variant="primary"
              onClick={() => setShowUploadModal(true)}
              className="w-auto px-6"
            >
              <span className="flex items-center space-x-2">
                <span>📤</span>
                <span>Upload Document</span>
              </span>
            </Button>
          </div>

          {documentsLoading ? (
            <div className="text-center py-8">
              <Loader />
              <p className="text-gray-300 mt-2">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-300">
              <span className="text-4xl mb-2 block">📭</span>
              No documents uploaded yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-600">
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">
                      Document Type
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">
                      File Name
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">
                      Size
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">
                      Uploaded By
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">
                      Upload Date
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-1 rounded bg-blue-600 text-white text-xs font-semibold">
                          {doc.document_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white font-medium">{doc.filename}</span>
                        {doc.description && (
                          <p className="text-xs text-gray-400 mt-1">{doc.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-sm">
                        {formatFileSize(doc.size)}
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-sm">
                        {doc.uploaded_by.email}
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-sm">
                        {formatDate(doc.created_at)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="primary"
                          onClick={() => handleDownloadDocument(doc.id, doc.filename)}
                          className="w-auto px-4 py-2 text-sm"
                        >
                          <span className="flex items-center space-x-1">
                            <span>⬇️</span>
                            <span>Download</span>
                          </span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Audit Notice */}
        <Card className="bg-blue-50 border-l-4 border-blue-500">
          <div className="flex items-start">
            <span className="text-2xl mr-3">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Audit Trail Notice</h3>
              <p className="text-sm text-blue-700">
                Your access to this employee profile and any document downloads are logged for
                security and compliance purposes. All sensitive data access is monitored.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <UploadDocumentModal
          employeeId={employeeId}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            loadEmployeeDocuments();
          }}
        />
      )}

      {/* Delete Employee Modal */}
      {showDeleteModal && (
        <DeleteEmployeeModal
          employee={employee}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={() => {
            router.push('/hr/employees');
          }}
        />
      )}
    </div>
  );
}

// Delete Employee Modal Component
function DeleteEmployeeModal({
  employee,
  onClose,
  onSuccess,
}: {
  employee: Employee;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'confirm' | 'password' | 'otp'>('confirm');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpRequested, setOtpRequested] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  const handleRequestOtp = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.post(`/hr/employees/${employee.id}/request-delete-otp`, {
        password,
      });

      console.log('[HR] OTP requested successfully');
      console.log('[HR] OTP Response:', response.data);
      
      // Capture debug OTP if returned (development mode)
      if (response.data?.otp_debug) {
        setDebugOtp(response.data.otp_debug);
        console.log('[HR] Debug OTP:', response.data.otp_debug);
      }
      
      setOtpRequested(true);
      setStep('otp');
    } catch (err: any) {
      console.error('[HR] Failed to request OTP:', err);
      setError(err.response?.data?.message || 'Failed to request OTP. Please check your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!otp) {
      setError('Please enter the OTP code');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.delete(`/hr/employees/${employee.id}`, {
        data: {
          password,
          otpCode: otp, // Changed from otp_code to otpCode to match backend
        },
      });

      console.log('[HR] Employee deleted successfully');
      onSuccess();
    } catch (err: any) {
      console.error('[HR] Failed to delete employee:', err);
      setError(err.response?.data?.message || 'Failed to delete employee. Please check your OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full" variant="glass">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-red-700 mb-2 flex items-center">
            <span className="mr-2">⚠️</span>
            Delete Employee
          </h2>
          <p className="text-gray-600">
            You are about to permanently delete <strong>{employee.name}</strong> (ID: {employee.employee_id})
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Step 1: Confirmation */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <h3 className="font-bold text-red-900 mb-2">⚠️ WARNING: This action is irreversible!</h3>
              <ul className="text-sm text-red-800 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>The employee record will be <strong>permanently deleted</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>All associated documents will be <strong>permanently deleted</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>This action <strong>CANNOT be undone</strong></span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>An audit log will be created for compliance</span>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>💡 Alternative:</strong> Consider changing the employee status to "TERMINATED" instead of deleting the record entirely. This preserves historical data.
              </p>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setStep('password')}
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
              >
                Proceed with Deletion
              </Button>
              <Button
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Password Verification */}
        {step === 'password' && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded">
              <p className="text-sm text-amber-800">
                <strong>🔐 Security Verification Required</strong>
                <br />
                To proceed, you must verify your identity with your password and a one-time code (OTP).
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleRequestOtp();
                  }
                }}
              />
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                variant="primary"
                onClick={handleRequestOtp}
                disabled={loading || !password}
                className="flex-1"
              >
                {loading ? 'Verifying...' : 'Request OTP Code'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setStep('confirm')}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: OTP Verification */}
        {step === 'otp' && (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-800">
                <strong>✅ Password Verified</strong>
                <br />
                {otpRequested ? 
                  'An OTP code has been generated. In production, this would be sent to your email.' :
                  'Password verified. Please enter your OTP code.'}
              </p>
            </div>

            {debugOtp && (
              <div className="p-4 bg-blue-50 border border-blue-400 rounded">
                <p className="text-sm text-blue-900">
                  <strong>🔧 Development Mode - Your OTP:</strong>
                  <br />
                  <span className="text-2xl font-mono font-bold tracking-widest">{debugOtp}</span>
                  <br />
                  <span className="text-xs">In production, this would be sent to your email instead.</span>
                </p>
              </div>
            )}

            <div className="p-4 bg-amber-50 border border-amber-200 rounded">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Development Mode:</strong> {debugOtp ? 'OTP shown above.' : 'Check the backend logs for your OTP code.'}
                <br />
                In production, the OTP would be sent to your registered email address.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                OTP Code *
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-lg tracking-widest text-center"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading && otp.length === 6) {
                    handleDelete();
                  }
                }}
              />
              <p className="mt-1 text-xs text-gray-500 text-center">
                Enter the 6-digit code from the backend logs
              </p>
            </div>

            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-sm text-red-800 font-semibold">
                ⚠️ Final Warning: Clicking "Delete Employee" will permanently remove all data. This cannot be undone!
              </p>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={loading || otp.length !== 6}
                className="flex-1 border-red-500 text-red-700 hover:bg-red-50 font-bold"
              >
                {loading ? 'Deleting...' : '🗑️ Delete Employee'}
              </Button>
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <span className="text-2xl">×</span>
        </button>
      </Card>
    </div>
  );
}

// Upload Document Modal Component
function UploadDocumentModal({
  employeeId,
  onClose,
  onSuccess,
}: {
  employeeId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('OTHER');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate PDF only
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed. Please select a PDF file.');
        setSelectedFile(null);
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file size (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setError('File size exceeds 10MB limit.');
        setSelectedFile(null);
        e.target.value = '';
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', documentType);
      if (description) {
        formData.append('description', description);
      }

      await api.post(`/hr/employees/${employeeId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('[HR] Document uploaded successfully');
      onSuccess();
    } catch (err: any) {
      console.error('[HR] Failed to upload document:', err);
      setError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full" variant="glass">
        <h2 className="text-2xl font-bold text-white mb-4">Upload Employee Document</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-4">
          {/* File Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              Select PDF File * <span className="text-sm text-gray-400">(PDF only, max 10MB)</span>
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,application/pdf"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
            <p className="mt-1 text-xs text-amber-300">
              ⚠️ Only PDF files are allowed for employee documents (resume, employment agreement, etc.)
            </p>
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-300">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              Document Type *
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="RESUME">📄 Resume / CV</option>
              <option value="EMPLOYMENT_AGREEMENT">📝 Employment Agreement</option>
              <option value="EMPLOYMENT_CONTRACT">📋 Employment Contract</option>
              <option value="OFFER_LETTER">💼 Offer Letter</option>
              <option value="IDENTITY_DOCUMENT">🆔 Identity Document (IC/Passport)</option>
              <option value="CERTIFICATION">🎓 Certification / Qualification</option>
              <option value="PERFORMANCE_REVIEW">⭐ Performance Review</option>
              <option value="OTHER">📎 Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this document..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <Button
            variant="primary"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
            className="flex-1"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={uploading}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-900/30 border border-blue-400 rounded-lg text-sm text-blue-200">
          ℹ️ Files will be scanned for malware before upload. Maximum file size: 10MB.
        </div>
      </Card>
    </div>
  );
}
