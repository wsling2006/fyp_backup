"use client";

import React from 'react';
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";

export const dynamic = 'force-dynamic';

export default function HRDashboard() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role !== "human_resources" && user.role !== "super_admin") {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            HR Dashboard
          </h1>
          <p className="text-slate-600 text-lg">
            Welcome back, {user.email}
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card variant="gradient" className="hover:shadow-xl transition-shadow cursor-pointer" onClick={() => router.push('/employees')}>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-3xl">
                👥
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Employees</h3>
                <p className="text-sm text-slate-600">View and manage employees</p>
              </div>
            </div>
          </Card>

          <Card variant="gradient" className="hover:shadow-xl transition-shadow cursor-pointer" onClick={() => router.push('/attendance')}>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-3xl">
                ⏰
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Attendance</h3>
                <p className="text-sm text-slate-600">Track attendance records</p>
              </div>
            </div>
          </Card>

          <Card variant="gradient" className="hover:shadow-xl transition-shadow cursor-pointer" onClick={() => router.push('/documents')}>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-3xl">
                📁
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Documents</h3>
                <p className="text-sm text-slate-600">Manage employee documents</p>
              </div>
            </div>
          </Card>

          <Card variant="gradient" className="hover:shadow-xl transition-shadow cursor-pointer" onClick={() => router.push('/announcements')}>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-3xl">
                📢
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Announcements</h3>
                <p className="text-sm text-slate-600">View company announcements</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="gradient">
            <h3 className="text-xl font-bold text-slate-800 mb-4">📊 Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-slate-700">Total Employees</span>
                <span className="font-bold text-blue-600">Click Employees to view</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-slate-700">Active Today</span>
                <span className="font-bold text-green-600">Check Attendance</span>
              </div>
            </div>
          </Card>

          <Card variant="gradient">
            <h3 className="text-xl font-bold text-slate-800 mb-4">ℹ️ System Notice</h3>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <p className="text-sm text-blue-700">
                <strong>Privacy Notice:</strong> All access to employee data is logged for security and audit purposes. 
                Please ensure you only access information necessary for your role.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
