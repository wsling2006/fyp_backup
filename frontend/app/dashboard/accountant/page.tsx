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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              {user?.role === 'super_admin' && (
                <Button onClick={() => router.push('/dashboard/superadmin')} className="mb-3 bg-gray-100 hover:bg-gray-200 text-gray-700 w-auto px-4 py-2 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </Button>
              )}
              <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent">Accountant Dashboard</h1>
              <p className="text-gray-500 mt-2 text-base font-medium">Securely manage financial documents, revenue records, and accounting files</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            {/* File picker: user chooses file first */}
            <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-2 border-blue-300 rounded-lg px-6 py-3 transition-all duration-200 font-semibold text-blue-700 hover:text-blue-800">
              <input type="file" className="hidden" onChange={handleFileSelect} />
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Choose File</span>
            </label>

            {/* Upload button: user explicitly starts upload; disabled while scanning */}
            <Button onClick={handleUpload} disabled={uploading || !selectedFile} className={`inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-lg transition-all duration-200 ${uploading || !selectedFile ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg'}`}>
              {uploading ? (
                <>
                  <Loader />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Upload</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {selectedFile && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 flex items-start gap-4 shadow-sm">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A11.94 11.94 0 001 10c2.773 4.649 7.748 7 12 7s9.228-2.351 12-7a11.94 11.94 0 00-1.222-1.778zM9.5 15a4.5 4.5 0 100-9 4.5 4.5 0 000 9zm0-2a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="font-semibold text-blue-900 text-base">File Selected</p>
            <p className="text-blue-700 mt-1 text-sm">{selectedFile.name} • {(selectedFile.size/1024).toFixed(1)} KB</p>
          </div>
        </div>
      )}
      {message && (
        <div className={`rounded-lg p-4 flex items-start gap-4 shadow-sm border-l-4 ${message.includes('success') || message.includes('Upload successful') || message.includes('deleted') ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500' : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-500'}`}>
          <svg className={`w-6 h-6 flex-shrink-0 mt-0.5 ${message.includes('success') || message.includes('Upload successful') || message.includes('deleted') ? 'text-green-600' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d={message.includes('success') || message.includes('Upload successful') || message.includes('deleted') ? "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" : "M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2z"} clipRule="evenodd" />
          </svg>
          <p className={`text-sm font-semibold ${message.includes('success') || message.includes('Upload successful') || message.includes('deleted') ? 'text-green-900' : 'text-red-900'}`}>{message}</p>
        </div>
      )}

      {/* Files Table Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Table Header */}
        <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-gray-900 px-8 py-6">
          <h2 className="text-2xl font-bold text-white">Uploaded Files</h2>
          <p className="text-gray-200 mt-1 text-sm font-medium">{files.length} file{files.length !== 1 ? 's' : ''} in total</p>
        </div>

        {/* Table */}
        {files.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-8 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Filename</th>
                  <th className="text-left px-8 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="text-left px-8 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Size</th>
                  <th className="text-left px-8 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Uploaded By</th>
                  <th className="text-right px-8 py-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.map(f => {
                  const canDelete = canDeleteFile(f);
                  const deleteTooltip = !canDelete 
                    ? "You have no permission to delete this file." 
                    : "";
                  
                  return (
                    <tr key={f.id} className="hover:bg-blue-50 transition-colors duration-150">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                          </svg>
                          <span className="font-semibold text-gray-900 text-sm">{f.filename}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="inline-flex text-xs font-semibold text-gray-700 bg-gray-200 px-3 py-1.5 rounded-full">{f.mimetype}</span>
                      </td>
                      <td className="px-8 py-5 text-sm font-medium text-gray-700">{(f.size / 1024).toFixed(1)} KB</td>
                      <td className="px-8 py-5 text-sm">
                        <span className="text-gray-800 font-medium">{f.uploaded_by?.email || 'Unknown'}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            onClick={() => download(f.id, f.filename)} 
                            disabled={uploading} 
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 transition-colors duration-150"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </Button>
                          <div className="relative group">
                            <Button 
                              onClick={() => canDelete && setDeleteDialog({ show: true, fileId: f.id, filename: f.filename })} 
                              disabled={uploading || !canDelete} 
                              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-150 ${canDelete ? 'bg-red-100 hover:bg-red-200 text-red-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                              title={deleteTooltip}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </Button>
                            {!canDelete && (
                              <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 w-48 px-3 py-2 bg-gray-900 text-white text-xs rounded shadow-lg z-50">
                                {deleteTooltip}
                                <div className="absolute top-full right-3 -mt-1">
                                  <div className="border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-8 py-16 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-gray-700 text-base font-semibold">No files uploaded yet</p>
            <p className="text-gray-500 text-sm mt-2">Choose a file and click Upload to get started</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialog?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Confirm Delete</h3>
              </div>
            </div>
            <p className="text-gray-600 mb-8 text-base">
              Are you sure you want to delete <span className="font-bold text-gray-900">"{deleteDialog.filename}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button 
                onClick={() => setDeleteDialog(null)} 
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => deleteFile(deleteDialog.fileId, deleteDialog.filename)} 
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-md"
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
