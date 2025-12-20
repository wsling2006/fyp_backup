"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import Input from "@/components/ui/Input";
import { useRouter } from 'next/navigation';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';

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

  // Analytics state
  const [trends, setTrends] = useState<any[]>([]);
  const [bySource, setBySource] = useState<any[]>([]);
  const [byClient, setByClient] = useState<any[]>([]);
  const [growthMetrics, setGrowthMetrics] = useState<any>(null);
  const [monthlyComparison, setMonthlyComparison] = useState<any[]>([]);

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

      // Fetch main revenue data and analytics in parallel
      const [revenueRes, summaryRes, trendsRes, bySourceRes, byClientRes, growthRes, monthlyRes] = await Promise.all([
        api.get(`/revenue?${params.toString()}`),
        api.get(`/revenue/summary?${params.toString()}`),
        api.get(`/revenue/analytics/trends?granularity=daily&${params.toString()}`).catch(() => ({ data: [] })),
        api.get(`/revenue/analytics/by-source?${params.toString()}`).catch(() => ({ data: [] })),
        api.get(`/revenue/analytics/by-client?${params.toString()}`).catch(() => ({ data: [] })),
        api.get(`/revenue/analytics/growth`).catch(() => ({ data: null })),
        api.get(`/revenue/analytics/monthly-comparison`).catch(() => ({ data: [] })),
      ]);

      setRevenues(revenueRes.data);
      setSummary(summaryRes.data);
      setTrends(trendsRes.data || []);
      setBySource(bySourceRes.data || []);
      setByClient(byClientRes.data || []);
      setGrowthMetrics(growthRes.data);
      setMonthlyComparison(monthlyRes.data || []);
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

  const formatCurrency = (cents: number, currency: string = 'SGD') => {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (revenues.length === 0) {
      setMessage('No data to export');
      return;
    }

    const headers = ['Date', 'Invoice ID', 'Client', 'Source', 'Amount', 'Status', 'Notes', 'Created By'];
    const rows = revenues.map((r) => [
      new Date(r.date).toLocaleDateString(),
      r.invoice_id || '-',
      r.client,
      r.source,
      formatCurrency(r.amount),
      r.status,
      r.notes || '-',
      r.created_by?.email || 'Unknown',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `revenue-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    setMessage('CSV exported successfully');
  };

  // Export to PDF
  const exportToPDF = () => {
    if (revenues.length === 0) {
      setMessage('No data to export');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Title
    doc.setFontSize(16);
    doc.text('Revenue Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Date range info
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 10;

    // Summary
    if (summary) {
      doc.setFontSize(11);
      doc.text('Summary:', 20, yPosition);
      yPosition += 7;
      doc.setFontSize(10);
      doc.text(`Total Revenue: ${formatCurrency(summary.total_revenue)}`, 25, yPosition);
      yPosition += 6;
      doc.text(`Paid: ${formatCurrency(summary.paid_revenue)} | Pending: ${formatCurrency(summary.pending_revenue)}`, 25, yPosition);
      yPosition += 10;
    }

    // Table
    doc.setFontSize(11);
    doc.text('Revenue Records:', 20, yPosition);
    yPosition += 8;

    const headers = ['Date', 'Invoice', 'Client', 'Source', 'Amount', 'Status'];
    const rows = revenues.map((r) => [
      new Date(r.date).toLocaleDateString(),
      r.invoice_id || '-',
      r.client.substring(0, 15), // Truncate for PDF
      r.source.substring(0, 12),
      formatCurrency(r.amount),
      r.status,
    ]);

    doc.setFontSize(9);
    const tableStartY = yPosition;
    const rowHeight = 7;
    const colWidths = [18, 16, 20, 20, 25, 16]; // Approximate column widths

    // Headers
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    let xPosition = 20;
    headers.forEach((header, idx) => {
      doc.text(header, xPosition, tableStartY);
      xPosition += colWidths[idx];
    });

    // Rows
    doc.setFont('helvetica', 'normal');
    yPosition = tableStartY + rowHeight;
    rows.forEach((row, rowIdx) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }

      xPosition = 20;
      row.forEach((cell, cellIdx) => {
        doc.text(String(cell), xPosition, yPosition);
        xPosition += colWidths[cellIdx];
      });
      yPosition += rowHeight;
    });

    doc.save(`revenue-export-${new Date().toISOString().split('T')[0]}.pdf`);
    setMessage('PDF exported successfully');
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

      {/* Summary Cards - KPI Section */}
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

      {/* Advanced KPI Cards - Growth & Averages */}
      {growthMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm text-purple-600 font-semibold">Revenue Growth (MoM)</div>
            <div className={`text-2xl font-bold ${growthMetrics.month_over_month_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {growthMetrics.month_over_month_growth > 0 ? '+' : ''}{growthMetrics.month_over_month_growth.toFixed(2)}%
            </div>
            <div className="text-xs text-purple-600 mt-1">Month over Month</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4">
            <div className="text-sm text-indigo-600 font-semibold">Revenue Growth (YoY)</div>
            <div className={`text-2xl font-bold ${growthMetrics.year_over_year_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {growthMetrics.year_over_year_growth > 0 ? '+' : ''}{growthMetrics.year_over_year_growth.toFixed(2)}%
            </div>
            <div className="text-xs text-indigo-600 mt-1">Year over Year</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-600 font-semibold">Avg Monthly Revenue</div>
            <div className="text-2xl font-bold text-orange-900">{formatCurrency(growthMetrics.average_monthly_revenue)}</div>
            <div className="text-xs text-orange-600 mt-1">Based on current year</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-200 rounded-lg p-4">
            <div className="text-sm text-cyan-600 font-semibold">Current Month</div>
            <div className="text-2xl font-bold text-cyan-900">{formatCurrency(growthMetrics.current_month_revenue)}</div>
            <div className="text-xs text-cyan-600 mt-1">This month's revenue</div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time Chart */}
        {trends.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: any) => value ? formatCurrency(value) : '-'} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Comparison Chart */}
        {monthlyComparison.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => value ? formatCurrency(value) : '-'} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Revenue by Source */}
        {bySource.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Source</h3>
            <div className="space-y-3">
              {bySource.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.source}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(item.revenue / Math.max(...bySource.map((c) => c.revenue))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-24 text-right">{formatCurrency(item.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue by Client */}
        {byClient.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Clients by Revenue</h3>
            <div className="space-y-3">
              {byClient.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.client}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(item.revenue / Math.max(...byClient.map((c) => c.revenue))) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-24 text-right">{formatCurrency(item.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Revenue Form - Modal at Top */}
      {showAddForm && (
        <div className="fixed top-0 left-0 right-0 bg-black/50 z-40" onClick={() => setShowAddForm(false)} />
      )}
      {showAddForm && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl bg-white border border-gray-300 rounded-lg p-6 shadow-2xl z-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Add New Revenue</h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>
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
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <Button type="submit" className="w-auto px-6 py-2">
                Save Revenue
              </Button>
            </div>
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
        <div className="mt-4 flex gap-2 flex-wrap">
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
          <Button
            onClick={exportToCSV}
            className="w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white"
          >
            📥 Export to CSV
          </Button>
          <Button
            onClick={exportToPDF}
            className="w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
          >
            📄 Export to PDF
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
              </tr>
            ))}
            {revenues.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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
