"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const menu = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊', roles: [] },
  { label: 'Employees', href: '/employees', icon: '👥', roles: ['super_admin', 'HR'] },
  { label: 'Attendance', href: '/attendance', icon: '⏰', roles: ['super_admin', 'HR'] },
  { label: 'Announcements', href: '/announcements', icon: '📢', roles: ['super_admin', 'HR'] },
  { label: 'Documents', href: '/documents', icon: '📁', roles: ['super_admin', 'HR'] },
  { label: 'Activity Logs', href: '/activity-logs', icon: '📝', roles: ['super_admin', 'HR'] },
  { label: 'Company Revenue', href: '/dashboard/accountant/revenue', icon: '💰', roles: ['super_admin', 'accountant'] },
  { label: 'Cash Flow', href: '/cash-flow', icon: '💵', roles: ['super_admin', 'accountant'] },
  { label: 'Financial Statements', href: '/financial-statements', icon: '📈', roles: ['super_admin', 'accountant'] },
  { label: 'Purchase Requests', href: '/purchase-requests', icon: '🛒', roles: ['super_admin', 'accountant'] },
  { label: 'Suppliers', href: '/suppliers', icon: '🏢', roles: ['super_admin', 'accountant'] },
  { label: 'Annual Expenses', href: '/annual-expenses', icon: '💸', roles: ['super_admin', 'accountant'] },
  { label: 'Payroll Reports', href: '/payroll-reports', icon: '💼', roles: ['super_admin', 'accountant'] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const userRole = user?.role?.toLowerCase() || '';

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 h-screen flex flex-col shadow-2xl border-r border-slate-700/50">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-xl font-bold">🏢</span>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Company Portal
            </h1>
            <p className="text-xs text-slate-400">Management System</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        <div className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-slate-800/50">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user?.email}
            </p>
            <p className="text-xs text-blue-400 font-medium capitalize">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {menu
          .filter(item => !item.roles.length || item.roles.includes(userRole))
          .map(item => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className={`
                  group flex items-center space-x-3 px-4 py-3 rounded-xl
                  transition-all duration-300 transform
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50 scale-[1.02]' 
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white hover:translate-x-1'
                  }
                `}
              >
                <span className="text-xl group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </span>
                <span className="font-medium text-sm">
                  {item.label}
                </span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                )}
              </Link>
            );
          })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-700/50">
        <button 
          onClick={logout} 
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 
                     bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700
                     text-white rounded-xl font-semibold
                     shadow-lg shadow-red-500/50 hover:shadow-red-600/50
                     transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
