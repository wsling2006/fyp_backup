'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loader from '@/components/ui/Loader';

interface EmployeeListItem {
  id: string;
  employee_id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
}

export default function EmployeesPage() {
  const { user, logout, isInitialized } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Wait for AuthContext to initialize
    if (!isInitialized) {
      return;
    }

    // Check authentication
    if (!user) {
      router.push('/login');
      return;
    }

    // Check role authorization (HR or SUPER_ADMIN only)
    if (user.role !== 'human_resources' && user.role !== 'super_admin') {
      router.push('/dashboard');
      return;
    }

    loadEmployees();
  }, [isInitialized, user, router]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/hr/employees');
      console.log('[HR] Loaded employees:', response.data.length);
      setEmployees(response.data);
    } catch (err: any) {
      console.error('[HR] Failed to load employees:', err);
      setError(err.response?.data?.message || 'Failed to load employees');
      
      if (err.response?.status === 401) {
        logout();
      } else if (err.response?.status === 403) {
        setError('Access denied. HR permissions required.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewEmployee = (employeeId: string) => {
    router.push(`/hr/employees/${employeeId}`);
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

  // Filter employees based on search query
  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(query) ||
      (emp.employee_id && emp.employee_id.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <Loader />
          <p className="text-gray-600 mt-4 text-lg">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Employee Directory</h1>
          <p className="text-gray-600">View and manage employee information</p>
        </div>

        {/* Error Alert */}
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

        {/* Search Bar */}
        <Card className="mb-6" variant="glass">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or employee ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                  🔍
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={loadEmployees}
              className="w-auto px-6"
            >
              <span className="flex items-center space-x-2">
                <span>🔄</span>
                <span>Refresh</span>
              </span>
            </Button>
          </div>
        </Card>

        {/* Employee Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredEmployees.length} of {employees.length} employees
        </div>

        {/* Employee Table */}
        <Card variant="gradient">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">
                    Employee ID
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">
                    Full Name
                  </th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-500">
                      {searchQuery ? 'No employees found matching your search' : 'No employees available'}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm text-gray-700">
                          {employee.employee_id || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-medium text-gray-900">
                          {employee.name}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(
                            employee.status
                          )}`}
                        >
                          {employee.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Button
                          variant="primary"
                          onClick={() => handleViewEmployee(employee.id)}
                          className="w-auto px-4 py-2 text-sm"
                        >
                          <span className="flex items-center space-x-1">
                            <span>👁️</span>
                            <span>View Profile</span>
                          </span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Info Footer */}
        <Card className="mt-6 bg-blue-50 border-l-4 border-blue-500">
          <div className="flex items-start">
            <span className="text-2xl mr-3">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">Data Privacy Notice</h3>
              <p className="text-sm text-blue-700">
                This list shows minimal employee information. Click "View Profile" to access full details.
                All access to sensitive employee data is logged for audit purposes.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
