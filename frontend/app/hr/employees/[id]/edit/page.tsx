'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
}

export default function EditEmployeePage() {
  const { user, logout, isInitialized } = useAuth();
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    emergency_contact: '',
    ic_number: '',
    birthday: '',
    bank_account_number: '',
    position: '',
    department: '',
    date_of_joining: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'TERMINATED',
  });

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
      loadEmployeeDetails();
    }
  }, [isInitialized, user, router, employeeId]);

  const loadEmployeeDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/hr/employees/${employeeId}`);
      const emp = response.data?.employee || response.data;
      setEmployee(emp);

      // Populate form with employee data
      setFormData({
        name: emp.name || '',
        email: emp.email || '',
        phone: emp.phone || '',
        address: emp.address || '',
        emergency_contact: emp.emergency_contact || '',
        ic_number: emp.ic_number || '',
        birthday: emp.birthday ? emp.birthday.split('T')[0] : '',
        bank_account_number: emp.bank_account_number || '',
        position: emp.position || '',
        department: emp.department || '',
        date_of_joining: emp.date_of_joining ? emp.date_of_joining.split('T')[0] : '',
        status: emp.status || 'ACTIVE',
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      // Prepare update data (only send non-empty fields)
      const updateData: any = {};
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== '' && value !== null) {
          updateData[key] = value;
        }
      });

      console.log('[HR] Updating employee:', employeeId, updateData);
      
      const response = await api.put(`/hr/employees/${employeeId}`, updateData);
      
      console.log('[HR] Employee updated successfully');
      setSuccessMessage('Employee updated successfully! Redirecting...');
      
      // Redirect back to employee detail page after 1.5 seconds
      // Add ?refresh=silent to indicate this is a post-update refresh (skip audit log)
      setTimeout(() => {
        router.push(`/hr/employees/${employeeId}?refresh=silent`);
      }, 1500);
      
    } catch (err: any) {
      console.error('[HR] Failed to update employee:', err);
      setError(err.response?.data?.message || 'Failed to update employee');
      
      if (err.response?.status === 401) {
        logout();
      } else if (err.response?.status === 403) {
        setError('Access denied. HR permissions required.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push(`/hr/employees/${employeeId}`)}
            className="w-auto mb-4 px-4 py-2"
          >
            ← Back to Employee Details
          </Button>
          <h1 className="text-4xl font-bold text-gray-900">Edit Employee</h1>
          <p className="text-gray-600 mt-1">
            Update information for {employee?.name}
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Card className="mb-6 border-l-4 border-green-500 bg-green-50">
            <div className="flex items-center">
              <span className="text-2xl mr-3">✅</span>
              <p className="text-green-800 font-semibold">{successMessage}</p>
            </div>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-l-4 border-red-500 bg-red-50">
            <div className="flex items-center">
              <span className="text-2xl mr-3">⚠️</span>
              <div>
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <Card variant="gradient" className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">👤</span>
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+60123456789"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Birthday
                </label>
                <input
                  type="date"
                  name="birthday"
                  value={formData.birthday}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Full address"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  name="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleInputChange}
                  placeholder="Name and phone number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </Card>

          {/* Sensitive Information */}
          <Card variant="glass" className="mb-6 border-l-4 border-amber-500">
            <div className="flex items-start mb-4">
              <span className="text-2xl mr-2">🔒</span>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">Sensitive Information</h2>
                <p className="text-sm text-amber-700 mt-1">
                  ⚠️ Changes to this information will be audit logged
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  IC Number / Passport
                </label>
                <input
                  type="text"
                  name="ic_number"
                  value={formData.ic_number}
                  onChange={handleInputChange}
                  placeholder="IC or Passport number"
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-amber-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  name="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={handleInputChange}
                  placeholder="Bank account number"
                  className="w-full px-4 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-amber-50"
                />
              </div>
            </div>
          </Card>

          {/* Job Information */}
          <Card className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">💼</span>
              Job Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="Job title/position"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Department
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  placeholder="Department name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Joining
                </label>
                <input
                  type="date"
                  name="date_of_joining"
                  value={formData.date_of_joining}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Employment Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="TERMINATED">TERMINATED</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/hr/employees/${employeeId}`)}
              disabled={submitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader />
                  Updating...
                </span>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>

        {/* Audit Notice */}
        <Card className="mt-6 bg-blue-50 border-l-4 border-blue-500">
          <div className="flex items-start">
            <span className="text-2xl mr-3">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Audit Logging</h3>
              <p className="text-sm text-blue-800">
                All changes to employee information are logged for security and compliance purposes. 
                The audit log will record what fields were changed, along with the old and new values.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
