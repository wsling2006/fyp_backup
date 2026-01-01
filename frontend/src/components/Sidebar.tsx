"use client";

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

// Example role-based menu config
const menu = [
	{ label: 'Dashboard', href: '/' },
	// HR Module - Employee Management
	{ label: 'Employee Management', href: '/hr/employees', roles: ['human_resources', 'super_admin'] },
	// Legacy HR features (keep for backward compatibility)
	{ label: 'Employees', href: '/employees', roles: ['SUPER_ADMIN', 'HR'] },
	{ label: 'Attendance', href: '/attendance', roles: ['SUPER_ADMIN', 'HR'] },
	{ label: 'Announcements', href: '/announcements', roles: ['SUPER_ADMIN', 'HR'] },
	{ label: 'Documents', href: '/documents', roles: ['SUPER_ADMIN', 'HR'] },
	{ label: 'Activity Logs', href: '/activity-logs', roles: ['SUPER_ADMIN', 'HR'] },
	// Accounting features
	{ label: 'Company Revenue', href: '/company-revenue', roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
	{ label: 'Cash Flow', href: '/cash-flow', roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
	{ label: 'Financial Statements', href: '/financial-statements', roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
	{ label: 'Purchase Requests', href: '/purchase-requests', roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
	{ label: 'Suppliers', href: '/suppliers', roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
	{ label: 'Annual Expenses', href: '/annual-expenses', roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
	{ label: 'Payroll Reports', href: '/payroll-reports', roles: ['SUPER_ADMIN', 'ACCOUNTANT'] },
];

export default function Sidebar() {
	const { user, logout } = useAuth();
	const userRole = user?.role || '';

	return (
		<aside className="w-64 bg-white shadow h-screen p-6 flex flex-col">
			<div className="text-2xl font-bold mb-8">Company Portal</div>
			<nav className="flex-1 space-y-2">
				{menu
					.filter(item => !item.roles || item.roles.includes(userRole))
					.map(item => (
						<Link key={item.href} href={item.href} className="block px-3 py-2 rounded hover:bg-blue-100 text-gray-700">
							{item.label}
						</Link>
					))}
			</nav>
			<div className="mt-auto">
				<button onClick={logout} className="w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600">Logout</button>
			</div>
		</aside>
	);
}
