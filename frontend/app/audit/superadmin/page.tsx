"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import Button from "@/components/ui/Button";
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export default function AuditLogDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    user_id: '',
    action: '',
    resource: '',
    start_date: '',
    end_date: '',
  });

  // Delete states
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Clear all states
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [clearAllPassword, setClearAllPassword] = useState('');
  const [clearAllOtp, setClearAllOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const allowedRole = user?.role === 'super_admin';

  useEffect(() => {
    if (!allowedRole) return;
    loadLogs();
  }, [allowedRole]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.user_id) params.append('user_id', filters.user_id);
      if (filters.action) params.append('action', filters.action);
      if (filters.resource) params.append('resource', filters.resource);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      params.append('limit', '100');

      const res = await api.get(`/audit?${params.toString()}`);
      setLogs(res.data.logs || []);
      setMessage(null);
    } catch (e: any) {
      setMessage(e.response?.data?.message || 'Failed to load audit logs');
      if (e.response?.status === 401 || e.response?.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadLogs();
  };

  const handleClearFilters = () => {
    setFilters({
      user_id: '',
      action: '',
      resource: '',
      start_date: '',
      end_date: '',
    });
    setTimeout(() => loadLogs(), 100);
  };

  // Delete individual log
  const handleDeleteLog = async (id: string) => {
    if (!deleteConfirm || deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }

    try {
      setDeleting(true);
      await api.delete(`/audit/${id}`);
      setMessage('Audit log deleted successfully');
      setDeleteConfirm(null);
      loadLogs();
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      setMessage(e.response?.data?.message || 'Failed to delete audit log');
      if (e.response?.status === 401 || e.response?.status === 403) {
        logout();
      }
    } finally {
      setDeleting(false);
    }
  };

  // Request OTP to clear all logs
  const handleRequestClearAllOtp = async () => {
    if (!clearAllPassword) {
      setMessage('Please enter your password');
      return;
    }

    try {
      setClearingAll(true);
      await api.post('/audit/clear-all/request-otp', { password: clearAllPassword });
      setOtpSent(true);
      setMessage('OTP sent to your email. Check your inbox.');
      setTimeout(() => setMessage(null), 5000);
    } catch (e: any) {
      setMessage(e.response?.data?.message || 'Failed to send OTP');
      if (e.response?.status === 401 || e.response?.status === 403) {
        logout();
      }
    } finally {
      setClearingAll(false);
    }
  };

  // Clear all logs after OTP verification
  const handleClearAllLogs = async () => {
    if (!clearAllOtp) {
      setMessage('Please enter the OTP from your email');
      return;
    }

    try {
      setClearingAll(true);
      const res = await api.post('/audit/clear-all/verify', { otp: clearAllOtp });
      setMessage(res.data.message || 'All audit logs cleared successfully');
      setShowClearAllModal(false);
      setClearAllPassword('');
      setClearAllOtp('');
      setOtpSent(false);
      loadLogs();
      setTimeout(() => setMessage(null), 5000);
    } catch (e: any) {
      setMessage(e.response?.data?.message || 'Failed to clear logs');
      if (e.response?.status === 401 || e.response?.status === 403) {
        logout();
      }
    } finally {
      setClearingAll(false);
    }
  };

  const closeClearAllModal = () => {
    setShowClearAllModal(false);
    setClearAllPassword('');
    setClearAllOtp('');
    setOtpSent(false);
    setMessage(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    if (action.startsWith('VIEW')) return 'bg-blue-100 text-blue-800';
    if (action.startsWith('CREATE')) return 'bg-green-100 text-green-800';
    if (action.startsWith('UPDATE')) return 'bg-yellow-100 text-yellow-800';
    if (action.startsWith('DELETE')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (!allowedRole) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-gray-600">You do not have access to the Audit Log dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.push('/dashboard/superadmin')} className="bg-gray-200 text-black hover:bg-gray-300 w-auto px-3 py-1">
            Back
          </Button>
          <h1 className="text-2xl font-bold">🔒 Audit Log Dashboard</h1>
        </div>
        <Button 
          onClick={() => setShowClearAllModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white w-auto px-4 py-2"
        >
          ⚠️ Clear All Logs
        </Button>
      </div>

      {message && (
        <div className={`p-3 rounded ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              This dashboard shows all user actions on sensitive resources. Use it to monitor access patterns, detect suspicious activity, and ensure compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Actions</option>
              <optgroup label="Revenue Actions">
                <option value="VIEW_REVENUE">VIEW_REVENUE</option>
                <option value="CREATE_REVENUE">CREATE_REVENUE</option>
                <option value="UPDATE_REVENUE">UPDATE_REVENUE</option>
                <option value="DELETE_REVENUE">DELETE_REVENUE</option>
              </optgroup>
              <optgroup label="Employee/HR Actions">
                <option value="VIEW_EMPLOYEE_PROFILE">VIEW_EMPLOYEE_PROFILE</option>
                <option value="CREATE_EMPLOYEE">CREATE_EMPLOYEE</option>
                <option value="UPDATE_EMPLOYEE">UPDATE_EMPLOYEE</option>
                <option value="DELETE_EMPLOYEE">DELETE_EMPLOYEE</option>
              </optgroup>
              <optgroup label="Document Actions">
                <option value="UPLOAD_DOCUMENT">UPLOAD_DOCUMENT</option>
                <option value="DOWNLOAD_DOCUMENT">DOWNLOAD_DOCUMENT</option>
                <option value="DELETE_DOCUMENT">DELETE_DOCUMENT</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
            <select
              value={filters.resource}
              onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">All Resources</option>
              <option value="revenue">Revenue</option>
              <option value="employee">Employee</option>
              <option value="user">User</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleFilter} className="w-auto px-4 py-2 text-sm">
              Apply
            </Button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 font-semibold">Total Actions</div>
          <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-semibold">View Actions</div>
          <div className="text-2xl font-bold text-blue-900">
            {logs.filter(l => l.action.startsWith('VIEW')).length}
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-semibold">Create Actions</div>
          <div className="text-2xl font-bold text-green-900">
            {logs.filter(l => l.action.startsWith('CREATE')).length}
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-600 font-semibold">Delete Actions</div>
          <div className="text-2xl font-bold text-red-900">
            {logs.filter(l => l.action.startsWith('DELETE')).length}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-gray-900">{log.user?.email || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{log.user?.role || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.resource}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(log.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 font-mono">{log.ip_address || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    {deleteConfirm === log.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          disabled={deleting}
                          className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleting ? 'Deleting...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          disabled={deleting}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear All Logs Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full relative">
            {/* Close button */}
            <button
              onClick={closeClearAllModal}
              disabled={clearingAll}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="bg-red-600 text-white p-6 rounded-t-lg">
              <div className="flex items-center gap-3">
                <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <h2 className="text-2xl font-bold">⚠️ CRITICAL ACTION</h2>
              </div>
              <p className="mt-2 text-red-100 text-sm">Clear All Audit Logs</p>
            </div>

            {/* Warning */}
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-bold text-red-800">⚠️ THIS ACTION CANNOT BE UNDONE!</p>
                    <p className="mt-2 text-sm text-red-700">
                      You are about to permanently delete <strong>ALL audit logs</strong> from the system. 
                      This will remove all historical records of user actions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                <p className="text-sm font-semibold text-yellow-900 mb-2">Before proceeding, ensure:</p>
                <ul className="text-sm text-yellow-800 space-y-1 ml-4">
                  <li>✓ You have exported/backed up necessary logs</li>
                  <li>✓ You have proper authorization</li>
                  <li>✓ You understand this is irreversible</li>
                  <li>✓ All stakeholders have been notified</li>
                </ul>
              </div>

              {!otpSent ? (
                <>
                  {/* Password Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter Your Password to Continue
                    </label>
                    <input
                      type="password"
                      value={clearAllPassword}
                      onChange={(e) => setClearAllPassword(e.target.value)}
                      placeholder="Your password"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      disabled={clearingAll}
                      onKeyPress={(e) => e.key === 'Enter' && handleRequestClearAllOtp()}
                    />
                  </div>

                  {/* Send OTP Button */}
                  <Button
                    onClick={handleRequestClearAllOtp}
                    disabled={clearingAll || !clearAllPassword}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-sm font-semibold"
                  >
                    {clearingAll ? 'Sending OTP...' : 'Send OTP to My Email'}
                  </Button>
                </>
              ) : (
                <>
                  {/* OTP Input */}
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                    <p className="text-sm text-blue-800 mb-3">
                      📧 An OTP has been sent to your email. Check your inbox and enter it below.
                    </p>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter 6-Digit OTP
                    </label>
                    <input
                      type="text"
                      value={clearAllOtp}
                      onChange={(e) => setClearAllOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-bold tracking-widest focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      disabled={clearingAll}
                      onKeyPress={(e) => e.key === 'Enter' && clearAllOtp.length === 6 && handleClearAllLogs()}
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      OTP is valid for 10 minutes
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleRequestClearAllOtp}
                      disabled={clearingAll}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 text-sm"
                    >
                      Resend OTP
                    </Button>
                    <Button
                      onClick={handleClearAllLogs}
                      disabled={clearingAll || clearAllOtp.length !== 6}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 text-sm font-bold"
                    >
                      {clearingAll ? 'Clearing...' : '🗑️ CLEAR ALL LOGS'}
                    </Button>
                  </div>
                </>
              )}

              {/* Cancel Button */}
              <Button
                onClick={closeClearAllModal}
                disabled={clearingAll}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
