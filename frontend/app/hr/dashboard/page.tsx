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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div onClick={() => router.push('/employees')} className="cursor-pointer">
            <Card variant="gradient" className="hover:shadow-xl transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-3xl">
                  👥
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Employees</h3>
                  <p className="text-sm text-slate-300">View and manage employees</p>
                </div>
              </div>
            </Card>
          </div>

          <div onClick={() => router.push('/attendance')} className="cursor-pointer">
            <Card variant="gradient" className="hover:shadow-xl transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-3xl">
                  ⏰
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Attendance</h3>
                  <p className="text-sm text-slate-300">Track attendance records</p>
                </div>
              </div>
            </Card>
          </div>

          <div onClick={() => router.push('/documents')} className="cursor-pointer">
            <Card variant="gradient" className="hover:shadow-xl transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-3xl">
                  📁
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Documents</h3>
                  <p className="text-sm text-slate-300">Manage employee documents</p>
                </div>
              </div>
            </Card>
          </div>

          <div onClick={() => router.push('/announcements')} className="cursor-pointer">
            <Card variant="gradient" className="hover:shadow-xl transition-shadow">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-3xl">
                  📢
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Announcements</h3>
                  <p className="text-sm text-slate-300">View company announcements</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
