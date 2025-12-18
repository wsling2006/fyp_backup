"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import Loader from "../../../components/ui/Loader";

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <Button onClick={logout}>Logout</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader /></div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-4 rounded shadow">
                <div className="text-sm text-gray-500">Total Users</div>
                <div className="text-2xl font-semibold">{stats?.total ?? 0}</div>
              </div>
              {/* Placeholder for more stats */}
              <div className="bg-white p-4 rounded shadow">
                <div className="text-sm text-gray-500">Recent Logins</div>
                <div className="text-xs text-gray-600">See table below</div>
              </div>
              <div className="bg-white p-4 rounded shadow">
                <div className="text-sm text-gray-500">Notice Board</div>
                <div className="text-xs text-gray-600">Coming soon</div>
              </div>
            </div>

            {/* Create user */}
            <div className="bg-white p-6 rounded shadow mb-6">
              <h2 className="text-lg font-semibold mb-4">Create New User</h2>
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
