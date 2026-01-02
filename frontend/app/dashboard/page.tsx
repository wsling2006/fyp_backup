"use client";
import React from 'react';
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { useRouter } from "next/navigation";
import Link from "next/link";
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  // Redirects must run on client after mount, not during render
  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role === "super_admin") {
        router.replace("/dashboard/superadmin");
      } else if (user.role === "accountant") {
        router.replace("/dashboard/accountant");
      } else if (user.role === "human_resources") {
        router.replace("/hr/employees");
      } else if (user.role === "sales_department" || user.role === "marketing") {
        router.replace("/purchase-requests");
      }
    }
  }, [user, loading, router]);

  // While deciding/redirecting, show a lightweight loader
  if (loading || !user) {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-10 w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
          <span className="text-4xl">👋</span>
        </div>
        <h2 className="text-3xl font-bold mb-2 text-white">Welcome!</h2>
        <p className="text-blue-200 mb-8 text-lg">{user?.email}</p>
        <Button onClick={logout} variant="danger" className="w-full">
          <span className="flex items-center justify-center space-x-2">
            <span>Logout</span>
            <span>🚪</span>
          </span>
        </Button>
      </div>

      {/* NEW: Announcements Card */}
      <div className="w-full max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/announcements" className="no-underline">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 hover:border-purple-400/50 transition-all duration-300 transform hover:scale-105 h-full">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl">📢</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Announcements</h3>
                <p className="text-blue-200 text-sm">
                  View company announcements and updates
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
