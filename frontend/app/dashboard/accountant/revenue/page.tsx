"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import Input from "@/components/ui/Input";
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface RevenueRecord {
  id: string;
  invoice_id: string | null;
  client: string;
  source: string;
  amount: number;
  currency: string;
  date: string;
  status: 'PAID' | 'PENDING';
  notes: string | null;
  created_by: { id: string; email: string } | null;
  created_at: string;
}

interface RevenueSummary {
  total_revenue: number;
  paid_revenue: number;
  pending_revenue: number;
  total_count: number;
  paid_count: number;
  pending_count: number;
}

export default function RevenueDashboard() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [revenues, setRevenues] = useState<RevenueRecord[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    invoice_id: '',
    client: '',
    source: '',
    amount: '',
    currency: 'SGD',
    date: new Date().toISOString().split('T')[0],
    status: 'PENDING' as 'PAID' | 'PENDING',
    notes: '',
  });

  // Filters
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    status: '',
    client: '',
  });

  const allowedRole = user?.role === 'accountant' || user?.role === 'super_admin';

  useEffect(() => {
    if (!allowedRole) return;
    loadData();
  }, [allowedRole]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.status) params.append('status', filters.status);
      if (filters.client) params.append('client', filters.client);

      const [revenueRes, summaryRes] = await Promise.all([
        api.get(`/revenue?${params.toString()}`),
        api.get(`/revenue/summary?${params.toString()}`),
      ]);

      setRevenues(revenueRes.data);
      setSummary(summaryRes.data);
      setMessage(null);
    } catch (e: any) {
      setMessage(e.response?.data?.message || 'Failed to load revenue data');
      if (e.response?.status === 401 || e.response?.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      // Convert amount to cents
      const amountInCents = Math.round(parseFloat(formData.amount) * 100);

      await api.post('/revenue', {
        ...formData,
        amount: amountInCents,
      });

      setMessage('Revenue record added successfully');
      setShowAddForm(false);
      setFormData({
        invoice_id: '',
        client: '',
        source: '',
        amount: '',
        currency: 'SGD',
        date: new Date().toISOString().split('T')[0],
        status: 'PENDING',
        notes: '',
      });
      loadData();
    } catch (e: any) {
      setMessage(e.response?.data?.message || 'Failed to add revenue record');
      if (e.response?.status === 401 || e.response?.status === 403) {
        logout();
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setMessage(null);
      await api.delete(`/revenue/${id}`);
      setMessage('Revenue record deleted successfully');
      setDeleteConfirm(null);
      loadData();
    } catch (e: any) {
      setMessage(e.response?.data?.message || 'Failed to delete revenue record');
      setDeleteConfirm(null);
      if (e.response?.status === 401 || e.response?.status === 403) {
        logout();
      }
    }
  };

  // Check if user can delete a revenue record
  const canDelete = (record: RevenueRecord) => {
    // Super admin can delete any record
    if (user?.role === 'super_admin') return true;
    // Accountant can only delete their own records
    return record.created_by?.id === user?.id;
  };

  if (!allowedRole) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="text-gray-600">You do not have access to the Revenue dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  const formatCurrency = (cents: number, currency: string = 'SGD') => {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {user?.role === 'super_admin' && (
            <Button onClick={() => router.push('/dashboard/superadmin')} className="bg-gray-200 text-black hover:bg-gray-300 w-auto px-3 py-1">
              Back
            </Button>
          )}
          <h1 className="text-2xl font-bold">Revenue Dashboard</h1>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="w-auto px-4 py-2">
          {showAddForm ? 'Cancel' : 'Add Revenue'}
        </Button>
      </div>

      {message && (
        <div className={`p-3 rounded ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-semibold">Total Revenue</div>
            <div className="text-2xl font-bold text-blue-900">{formatCurrency(summary.total_revenue)}</div>
            <div className="text-xs text-blue-600 mt-1">{summary.total_count} records</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-600 font-semibold">Paid</div>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(summary.paid_revenue)}</div>
            <div className="text-xs text-green-600 mt-1">{summary.paid_count} records</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-600 font-semibold">Pending</div>
            <div className="text-2xl font-bold text-yellow-900">{formatCurrency(summary.pending_revenue)}</div>
            <div className="text-xs text-yellow-600 mt-1">{summary.pending_count} records</div>
          </div>
        </div>
      )}

      {/* Add Revenue Form */}
      {showAddForm && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Add New Revenue</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Invoice ID (Optional)"
                value={formData.invoice_id}
                onChange={(e) => setFormData({ ...formData, invoice_id: e.target.value })}
                placeholder="INV-001"
              />
              <Input
                label="Client *"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                placeholder="Client name"
                required
              />
              <Input
                label="Source *"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="Product Sales, Consulting, etc."
                required
              />
              <Input
                label="Amount (SGD) *"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="1000.00"
                required
              />
              <Input
                label="Date *"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium mb-1">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'PAID' | 'PENDING' })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes"
                className="w-full border rounded px-3 py-2"
                rows={3}
              />
            </div>
            <Button type="submit" className="w-auto px-6 py-2">
              Save Revenue
            </Button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
          />
          <Input
            label="End Date"
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          <Input
            label="Client"
            value={filters.client}
            onChange={(e) => setFilters({ ...filters, client: e.target.value })}
            placeholder="Filter by client"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={loadData} className="w-auto px-4 py-2">
            Apply Filters
          </Button>
          <Button
            onClick={() => {
              setFilters({ start_date: '', end_date: '', status: '', client: '' });
              loadData();
            }}
            className="w-auto px-4 py-2 bg-gray-200 text-black hover:bg-gray-300"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Revenue Table */}
      <div className="border rounded overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Invoice ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Source</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Created By</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {revenues.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{new Date(r.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-sm">{r.invoice_id || '-'}</td>
                <td className="px-4 py-3 text-sm">{r.client}</td>
                <td className="px-4 py-3 text-sm">{r.source}</td>
                <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(r.amount, r.currency)}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    r.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{r.created_by?.email || 'Unknown'}</td>
                <td className="px-4 py-3 text-sm">
                  {canDelete(r) && (
                    <Button
                      onClick={() => handleDelete(r.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {revenues.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No revenue records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
