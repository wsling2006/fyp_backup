"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { useRouter } from 'next/navigation';

// Force dynamic rendering for auth-dependent page
export const dynamic = 'force-dynamic';

interface FileItem {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  created_at: string;
  uploaded_by?: { id: string; email: string } | null;
}

export default function AccountantDashboard() {
  const { user, token, logout } = useAuth();
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  // selectedFile holds the file chosen by the user before upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // uploading represents network + backend scanning in progress
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState<{ show: boolean; fileId: string; filename: string } | null>(null);

  const allowedRole = user?.role === 'accountant' || user?.role === 'super_admin';

  // Check if user can delete a file
  // Super admins can delete any file, accountants can only delete their own files
  const canDeleteFile = (file: FileItem): boolean => {
    if (user?.role === 'super_admin') return true;
    if (!file.uploaded_by) return false; // Can't delete files with unknown uploader
    return file.uploaded_by.id === user?.id;
  };

  useEffect(() => {
    if (!allowedRole) return;
    const load = async () => {
      try {
        const res = await api.get('/accountant-files');
        setFiles(res.data.files || []);
      } catch (e: any) {
        if (e.response?.status === 401 || e.response?.status === 403) {
          setMessage('Unauthorized. Logging out.');
          logout();
        } else {
          setMessage(e.response?.data?.message || 'Failed to load files');
        }
      }
    };
    load();
  }, [allowedRole, logout]);

  // Heuristic: read first chunk of file and determine if it looks like text
  const isProbablyText = async (file: File) => {
    if (file.type && file.type !== 'application/octet-stream') {
      return file.type.startsWith('text/') || file.type === 'application/xml' || file.type === 'application/json';
    }
    if (file.name && file.name.toLowerCase().endsWith('.txt')) return true;
    const slice = file.slice(0, Math.min(4096, file.size));
    const buf = await slice.arrayBuffer();
    const arr = new Uint8Array(buf);
    let nonPrintable = 0;
    for (let i = 0; i < arr.length; i++) {
      const byte = arr[i];
      if (byte === 9 || byte === 10 || byte === 13) continue;
      if (byte >= 32 && byte <= 126) continue;
      nonPrintable++;
      if (nonPrintable > arr.length * 0.1) {
        return false;
      }
    }
    return true;
  };

  // Handle file selection (user chooses a file but does not start upload yet)
  const handleFileSelect = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0] || null;
    setMessage(null);
    setSelectedFile(file);
  };

  // Upload is triggered explicitly by the user clicking the Upload button
  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please choose a file first');
      return;
    }

    setMessage(null);

    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (selectedFile.size > maxSize) {
      setMessage('File too large');
      return;
    }

    // Quick client-side mime checks, but server is authoritative
    const mimeOk =
      (selectedFile.type && (allowed.includes(selectedFile.type) || selectedFile.type.startsWith('text/')))
      || (selectedFile.type === '' && selectedFile.name.toLowerCase().endsWith('.txt'))
      || (selectedFile.type === 'application/octet-stream' && selectedFile.name.toLowerCase().endsWith('.txt'));

    let textOk = false;
    try {
      textOk = await isProbablyText(selectedFile);
    } catch (err) {
      textOk = false;
      console.error('[Upload] text heuristic failed', err);
    }

    const canProceed = mimeOk || textOk;
    if (!canProceed) {
      setMessage('Unsupported file type');
      return;
    }

    // 1) Start loading state immediately when user initiates upload
    setUploading(true);

    const form = new FormData();
    form.append('file', selectedFile);

    try {
      // 2) POST file to backend. Backend will perform temporary save + ClamAV scan.
      const res = await api.post('/accountant-files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // allow up to 2 minutes for scan
      });

      // 3) On success, clear selected file, update list, and show success
      setMessage('Upload successful');
      setSelectedFile(null);
      const list = await api.get('/accountant-files');
      setFiles(list.data.files || []);
    } catch (e: any) {
      // 4) On error, display backend message. Backend sends clear reasons like 'Malware detected'
      setMessage(e.response?.data?.message || 'Upload failed');
      if (e.response?.status === 401 || e.response?.status === 403) logout();
    } finally {
      // 5) Stop loading state after backend response/error
      setUploading(false);
      // Reset file input control visually by finding any input and clearing value
      const input = document.querySelector<HTMLInputElement>('input[type=file]');
      if (input) input.value = '';
    }
  };

  const download = async (id: string, filename: string) => {
    try {
      const res = await api.get(`/accountant-files/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setMessage(e.response?.data?.message || 'Download failed');
      if (e.response?.status === 401 || e.response?.status === 403) logout();
    }
  };

  // Delete a file with confirmation and refresh the list
  const deleteFile = async (id: string, filename: string) => {
    try {
      await api.delete(`/accountant-files/${id}`);
      setMessage('File deleted successfully');
      setDeleteDialog(null);
      const list = await api.get('/accountant-files');
      setFiles(list.data.files || []);
    } catch (e: any) {
      setMessage(e.response?.data?.message || 'Delete failed');
      setDeleteDialog(null);
      if (e.response?.status === 401 || e.response?.status === 403) logout();
    }
  };

  if (!allowedRole) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="text-gray-600">You do not have access to the Accountant dashboard.</p>
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
          <h1 className="text-2xl font-bold">Accountant Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* File picker: user chooses file first */}
          <label className="cursor-pointer bg-white border rounded px-3 py-2">
            <input type="file" className="hidden" onChange={handleFileSelect} />
            <span className="text-sm">Choose File</span>
          </label>

          {/* Upload button: user explicitly starts upload; disabled while scanning */}
          <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
            {uploading ? (
              <span className="flex items-center gap-2"><Loader />Scanning file...</span>
            ) : (
              'Upload'
            )}
          </Button>
        </div>
      </div>

      {/* Show the selected file name (if any) and messages */}
      {selectedFile && (
        <div className="text-sm text-gray-700">Selected: {selectedFile.name} ({(selectedFile.size/1024).toFixed(1)} KB)</div>
      )}
      {message && (
        <div className="text-sm text-gray-700">{message}</div>
      )}

      <div className="border rounded">
        <div className="grid grid-cols-5 gap-4 p-3 font-semibold bg-gray-50">
          <div>Filename</div>
          <div>Type</div>
          <div>Size</div>
          <div>Uploaded By</div>
          <div>Action</div>
        </div>
        {files.map(f => {
          const canDelete = canDeleteFile(f);
          const deleteTooltip = !canDelete 
            ? "You have no permission to delete this file." 
            : "";
          
          return (
            <div key={f.id} className="grid grid-cols-5 gap-4 p-3 border-t">
              <div>{f.filename}</div>
              <div className="text-xs text-gray-600">{f.mimetype}</div>
              <div className="text-xs">{(f.size / 1024).toFixed(1)} KB</div>
              <div className="text-xs">{f.uploaded_by?.email || 'Unknown'}</div>
              <div>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => download(f.id, f.filename)} 
                    disabled={uploading} 
                    className="w-24 px-4 py-2 text-sm text-center bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Download
                  </Button>
                  <div className="relative group">
                    <Button 
                      onClick={() => canDelete && setDeleteDialog({ show: true, fileId: f.id, filename: f.filename })} 
                      disabled={uploading || !canDelete} 
                      className={`w-24 px-4 py-2 text-sm text-center ${canDelete ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-4 focus:ring-red-500/30' : 'bg-gray-400 cursor-not-allowed hover:bg-gray-400 text-black/60'}`}
                      title={deleteTooltip}
                    >
                      Delete
                    </Button>
                    {!canDelete && (
                      <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 max-w-md w-auto px-3 py-2 bg-gray-900 text-white text-sm rounded shadow-lg z-50 whitespace-normal break-words">
                        {deleteTooltip}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                          <div className="border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {files.length === 0 && (
          <div className="p-4 text-sm text-gray-500">No files uploaded yet.</div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialog?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Delete</h3>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">"{deleteDialog.filename}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button 
                onClick={() => setDeleteDialog(null)} 
                className="bg-gray-200 text-gray-800 hover:bg-gray-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => deleteFile(deleteDialog.fileId, deleteDialog.filename)} 
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
