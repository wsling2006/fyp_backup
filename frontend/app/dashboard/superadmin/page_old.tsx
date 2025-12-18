"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import Loader from "../../../components/ui/Loader";
import StatsCard from "../../../components/ui/StatsCard";
import { Card } from "../../../components/ui/Card";

// Force dynamic rendering for auth-dependent page
export const dynamic = 'force-dynamic';

interface UserItem {
  id: string;
  email: string;
  role: string;
  last_login_at?: string;
  created_at?: string;
  account_locked_until?: string | null;
}

// New: Accountant file item shape for listing
interface AccountantFileItem {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<{ total: number } | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("sales_department");
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [suspendUntil, setSuspendUntil] = useState<Record<string, string>>({});

  // New: Accountant files state
  const [acctFiles, setAcctFiles] = useState<AccountantFileItem[]>([]);
  const [acctError, setAcctError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "super_admin") {
      router.replace("/dashboard");
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const [countRes, usersRes, filesRes] = await Promise.all([
          api.get("/users/count"),
          api.get("/users"),
          api.get("/accountant-files"),
        ]);
        setStats(countRes.data);
        setUsers(usersRes.data.users);
        setAcctFiles(filesRes.data?.files ?? []);
        setAcctError(null);
      } catch (e: any) {
        setError(e.response?.data?.message || "Failed to load data");
        if (e.response?.status === 401 || e.response?.status === 403) logout();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, router, logout]);

  const reload = async () => {
    const [countRes, usersRes] = await Promise.all([
      api.get("/users/count"),
      api.get("/users"),
    ]);
    setStats(countRes.data);
    setUsers(usersRes.data.users);
    // Also refresh accountant files
    try {
      const filesRes = await api.get("/accountant-files");
      setAcctFiles(filesRes.data?.files ?? []);
    } catch (e: any) {
      setAcctError(e.response?.data?.message || "Failed to load accountant files");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateMsg(null);
    try {
      const res = await api.post("/users/create", {
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      setCreateMsg("User created successfully");
      setNewEmail("");
      setNewPassword("");
      // reload
      const usersRes = await api.get("/users");
      setUsers(usersRes.data.users);
      const countRes = await api.get("/users/count");
      setStats(countRes.data);
    } catch (e: any) {
      setCreateMsg(e.response?.data?.message || "Failed to create user");
    }
  };

  const handleSuspend = async (userId: string) => {
    try {
      const until = suspendUntil[userId];
      if (!until) return; // require a date/time to suspend
      await api.post("/users/suspend", { id: userId, until });
      await reload();
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to suspend user");
    }
  };

  const handleClearSuspend = async (userId: string) => {
    try {
      await api.post("/users/suspend", { id: userId }); // no until -> clear
      await reload();
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to clear suspension");
    }
  };

  const handleDelete = async (userId: string, userEmail: string) => {
    if (!confirm(`Delete user ${userEmail}? This cannot be undone.`)) return;
    try {
      await api.post("/users/delete", { id: userId });
      await reload();
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to delete user");
    }
  };

  // New: Download accountant file
  const downloadFile = async (id: string, filename: string) => {
    try {
      const res = await api.get(`/accountant-files/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Download failed';
      alert(msg);
      if (e.response?.status === 401 || e.response?.status === 403) logout();
    }
  };

  // Calculate additional stats
  const recentLogins = users.filter(u => {
    if (!u.last_login_at) return false;
    const daysSince = (Date.now() - new Date(u.last_login_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  }).length;

  const suspendedUsers = users.filter(u => 
    u.account_locked_until && new Date(u.account_locked_until) > new Date()
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Super Admin Dashboard
              </h1>
              <p className="text-gray-600 flex items-center space-x-2">
                <span className="text-xl">👤</span>
                <span>{user?.email}</span>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold">SUPER ADMIN</span>
              </p>
            </div>
            <Button onClick={logout} variant="danger">
              <span className="flex items-center space-x-2">
                <span>Logout</span>
                <span>🚪</span>
              </span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader />
            <p className="text-gray-600 mt-4 text-lg font-medium">Loading dashboard...</p>
          </div>
        ) : error ? (
          <Card variant="glass" className="text-center py-12">
            <div className="text-red-600 text-lg font-semibold mb-2">⚠️ Error</div>
            <div className="text-gray-700">{error}</div>
          </Card>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title="Total Users"
                value={stats?.total ?? 0}
                variant="blue"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              />
              
              <StatsCard
                title="Recent Logins"
                value={recentLogins}
                variant="green"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                trend={{ value: `${recentLogins} this week`, isPositive: true }}
              />

              <StatsCard
                title="Suspended Users"
                value={suspendedUsers}
                variant="orange"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
              />

              <StatsCard
                title="Accountant Files"
                value={acctFiles.length}
                variant="purple"
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
            </div>
              {createMsg && (
                <div className={`mb-3 text-sm ${createMsg.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                  {createMsg}
                </div>
              )}
              <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input type="email" placeholder="Email" value={newEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEmail(e.target.value)} required />
                <Input type="password" placeholder="Temp Password" value={newPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)} required />
                <select className="border rounded px-3 py-2" value={newRole} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewRole(e.target.value)}>
                  <option value="sales_department">Sales</option>
                  <option value="human_resources">HR</option>
                  <option value="marketing">Marketing</option>
                  <option value="accountant">Accountant</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <Button type="submit">Create</Button>
              </form>
            </div>

            {/* Users table */}
            <div className="bg-white p-6 rounded shadow mb-6">
              <h2 className="text-lg font-semibold mb-4">Users</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Role</th>
                      <th className="py-2 pr-4">Last Login</th>
                      <th className="py-2 pr-4">Created</th>
                      <th className="py-2 pr-4">Suspended Until</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 pr-4">{u.email}</td>
                        <td className="py-2 pr-4 capitalize">{u.role?.replace('_', ' ')}</td>
                        <td className="py-2 pr-4">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '-'}</td>
                        <td className="py-2 pr-4">{u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</td>
                        <td className="py-2 pr-4">
                          {u.account_locked_until && new Date(u.account_locked_until) > new Date() ? (
                            <span className="text-red-600">{new Date(u.account_locked_until).toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-500">Not suspended</span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <input
                              type="datetime-local"
                              className="border rounded px-2 py-1"
                              value={suspendUntil[u.id] || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSuspendUntil(prev => ({ ...prev, [u.id]: e.target.value }))}
                            />
                            <Button onClick={() => handleSuspend(u.id)} className="whitespace-nowrap">Suspend</Button>
                            <Button onClick={() => handleClearSuspend(u.id)} className="whitespace-nowrap bg-gray-500 hover:bg-gray-600">Clear</Button>
                            <Button onClick={() => handleDelete(u.id, u.email)} className="whitespace-nowrap bg-red-600 hover:bg-red-700">Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Accountant overview */}
            <div className="bg-white p-6 rounded shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Accountant Files Overview</h2>
                <div className="flex gap-2">
                  <Button onClick={() => router.push('/dashboard/accountant')}>Open Accountant Dashboard</Button>
                  <Button onClick={async () => {
                    try {
                      const filesRes = await api.get('/accountant-files');
                      setAcctFiles(filesRes.data?.files ?? []);
                      setAcctError(null);
                    } catch (e: any) {
                      setAcctError(e.response?.data?.message || 'Failed to refresh files');
                    }
                  }} className="bg-gray-600 hover:bg-gray-700">Refresh</Button>
                </div>
              </div>
              {acctError && <div className="text-red-600 text-sm mb-3">{acctError}</div>}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Filename</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Size</th>
                      <th className="py-2 pr-4">Uploaded</th>
                      <th className="py-2 pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acctFiles.map(f => (
                      <tr key={f.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 pr-4">{f.filename}</td>
                        <td className="py-2 pr-4 text-xs text-gray-600">{f.mimetype}</td>
                        <td className="py-2 pr-4 text-xs">{(f.size / 1024).toFixed(1)} KB</td>
                        <td className="py-2 pr-4">{new Date(f.created_at).toLocaleString()}</td>
                        <td className="py-2 pr-4">
                          <Button onClick={() => downloadFile(f.id, f.filename)}>Download</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {acctFiles.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">No files uploaded yet.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
