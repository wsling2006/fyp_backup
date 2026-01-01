'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loader from '@/components/ui/Loader';

export default function HRDashboardPage() {
  const { user, logout, loading, isInitialized } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && isInitialized) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'human_resources' && user.role !== 'super_admin') {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, isInitialized, router]);

  if (loading || !isInitialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        <div className="text-center">
          <Loader />
          <p className="text-white mt-4 text-lg font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-2xl">
              <span className="text-5xl">👋</span>
            </div>
            <h1 className="text-5xl font-bold mb-3 text-white">Welcome, HR Team!</h1>
            <p className="text-blue-200 text-xl">{user?.email}</p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Employee Management Card */}
            <div onClick={() => router.push('/hr/employees')} className="cursor-pointer">
              <Card variant="glass" hover>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mb-4 shadow-lg">
                    <span className="text-3xl">👥</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Employee Management
                  </h3>
                  <p className="text-gray-600 mb-4">
                    View employee directory, access profiles, and manage employee documents
                  </p>
                  <Button variant="primary" className="w-full">
                    <span className="flex items-center justify-center space-x-2">
                      <span>View Employees</span>
                      <span>→</span>
                    </span>
                  </Button>
                </div>
              </Card>
            </div>

            {/* Security Notice Card */}
            <Card variant="glass" className="flex flex-col justify-center">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl mb-4 shadow-lg">
                  <span className="text-3xl">🔒</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Security Notice</h3>
                <p className="text-gray-600 text-sm">
                  All access to employee data is logged and monitored for compliance.
                  Please handle sensitive information responsibly.
                </p>
              </div>
            </Card>
          </div>

          {/* Quick Stats */}
          <Card variant="glass" className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📊</span>
              Quick Access
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/hr/employees')}
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
              >
                <div className="text-3xl mb-2">📋</div>
                <div className="font-semibold text-gray-900">Employee Directory</div>
                <div className="text-sm text-gray-600">Browse all employees</div>
              </button>
              <button
                onClick={() => router.push('/hr/employees')}
                className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
              >
                <div className="text-3xl mb-2">🔍</div>
                <div className="font-semibold text-gray-900">Search Employees</div>
                <div className="text-sm text-gray-600">Find by name or ID</div>
              </button>
              <button
                onClick={() => router.push('/hr/employees')}
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
              >
                <div className="text-3xl mb-2">📄</div>
                <div className="font-semibold text-gray-900">Documents</div>
                <div className="text-sm text-gray-600">Manage employee files</div>
              </button>
            </div>
          </Card>

          {/* Logout Button */}
          <div className="text-center">
            <Button onClick={logout} variant="danger" className="w-full max-w-md mx-auto">
              <span className="flex items-center justify-center space-x-2">
                <span>Logout</span>
                <span>🚪</span>
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
