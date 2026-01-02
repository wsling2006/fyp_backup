'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { createAnnouncement, uploadAttachment } from '@/utils/announcementApi';

const CreateAnnouncementPage: React.FC = () => {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'GENERAL',
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.push('/login');
      return;
    }
    // Only HR and Super Admin can create announcements
    if (user.role !== 'human_resources' && user.role !== 'super_admin') {
      router.push('/announcements');
      return;
    }
  }, [isInitialized, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create announcement
      const announcement = await createAnnouncement(formData);

      // Upload attachments if any
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          try {
            await uploadAttachment(announcement.id, files[i]);
          } catch (error) {
            console.error(`Failed to upload ${files[i].name}:`, error);
            alert(`Failed to upload ${files[i].name}. ${error}`);
          }
        }
      }

      alert('Announcement created successfully!');
      router.push('/announcements');
    } catch (error: any) {
      console.error('Failed to create announcement:', error);
      alert(`Failed to create announcement: ${error.response?.data?.message || error.message}`);
    }
    setLoading(false);
  };

  if (!isInitialized || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Announcements
          </button>
          <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
            📢 Create New Announcement
          </h1>
          <p className="text-gray-600 mt-2">Share important updates with all employees</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              {/* Title */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  maxLength={255}
                  placeholder="Enter announcement title"
                />
              </div>

              {/* Priority */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Priority Level <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  required
                >
                  <option value="GENERAL">📢 General (Normal announcement)</option>
                  <option value="IMPORTANT">⚠️ Important (Red dot indicator)</option>
                  <option value="URGENT">🚨 Urgent (Blocking popup)</option>
                </select>
                
                {/* Priority Descriptions */}
                <div className="mt-3 p-4 rounded-lg border">
                  {formData.priority === 'URGENT' && (
                    <div className="flex items-start gap-2 text-red-700 bg-red-50 p-3 rounded-lg">
                      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-semibold">🚨 Urgent Priority</p>
                        <p className="text-sm mt-1">Will show blocking modal to all users on next login</p>
                      </div>
                    </div>
                  )}
                  {formData.priority === 'IMPORTANT' && (
                    <div className="flex items-start gap-2 text-yellow-700 bg-yellow-50 p-3 rounded-lg">
                      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-semibold">⚠️ Important Priority</p>
                        <p className="text-sm mt-1">Will show red dot indicator until acknowledged</p>
                      </div>
                    </div>
                  )}
                  {formData.priority === 'GENERAL' && (
                    <div className="flex items-start gap-2 text-gray-600 bg-gray-50 p-3 rounded-lg">
                      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="font-semibold">📢 General Priority</p>
                        <p className="text-sm mt-1">Normal announcement, no special notification</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  rows={10}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  placeholder="Enter announcement content..."
                />
              </div>

              {/* Attachments */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Attachments (Optional)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    multiple
                    onChange={(e) => setFiles(e.target.files)}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Max 20MB per file. All files scanned for malware.
                </p>
                
                {files && files.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="font-semibold text-gray-700 mb-2">Selected Files:</p>
                    <div className="space-y-2">
                      {Array.from(files).map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="font-medium">{file.name}</span>
                          <span className="text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Announcement
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Security Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h3 className="text-lg font-bold text-gray-800">Security Policy</h3>
              </div>

              <div className="space-y-4">
                {/* Allowed Files */}
                <div>
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Allowed Files
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1 ml-6">
                    <li>• Documents: PDF, Word, Excel</li>
                    <li>• Images: JPEG, PNG, GIF</li>
                    <li>• Archives: ZIP, RAR, 7z</li>
                    <li>• Text: TXT, CSV</li>
                  </ul>
                </div>

                {/* Blocked Files */}
                <div>
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                    </svg>
                    Blocked Files
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1 ml-6">
                    <li>• .exe, .bat, .cmd, .sh</li>
                    <li>• .ps1, .js, .vbs, .jar</li>
                    <li>• .apk, .msi, .dll</li>
                  </ul>
                </div>

                {/* Security Features */}
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Security Features
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1 ml-6">
                    <li>• ClamAV virus scanning</li>
                    <li>• MIME type validation</li>
                    <li>• SHA-256 hashing</li>
                    <li>• Secure DB storage</li>
                    <li>• Forced download only</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAnnouncementPage;
