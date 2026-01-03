'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAllAnnouncements, updateAnnouncement, Announcement } from '@/utils/announcementApi';
import { useToast } from '@/context/ToastContext';

const EditAnnouncementPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const announcementId = params?.id as string;

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('GENERAL');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (announcementId) {
      loadAnnouncement();
    }
  }, [announcementId]);

  const loadAnnouncement = async () => {
    setLoading(true);
    try {
      const announcements = await getAllAnnouncements();
      const found = announcements.find((a: Announcement) => a.id === announcementId);
      
      if (found) {
        setAnnouncement(found);
        setTitle(found.title);
        setContent(found.content);
        setPriority(found.priority);
      } else {
        showToast('Announcement not found', 'error');
        router.push('/announcements');
      }
    } catch (error) {
      console.error('Failed to load announcement:', error);
      showToast('Failed to load announcement', 'error');
      router.push('/announcements');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Please enter a title', 'error');
      return;
    }

    if (!content.trim()) {
      showToast('Please enter content', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await updateAnnouncement(announcementId, {
        title: title.trim(),
        content: content.trim(),
        priority,
      });

      showToast('Announcement updated successfully! 🎉', 'success');
      router.push(`/announcements/${announcementId}`);
    } catch (error: any) {
      console.error('Failed to update announcement:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update announcement';
      showToast(`Error: ${errorMessage}`, 'error');
    }
    setSubmitting(false);
  };

  const handleCancel = () => {
    router.push(`/announcements/${announcementId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading announcement...</p>
        </div>
      </div>
    );
  }

  if (!announcement) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={handleCancel}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Announcement</h1>
            <p className="text-gray-600 mt-1">Update the announcement details below</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Announcement Information</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Priority Level <span className="text-red-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={submitting}
            >
              <option value="GENERAL">📢 General</option>
              <option value="IMPORTANT">⚠️ Important</option>
              <option value="URGENT">🚨 Urgent</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              {priority === 'URGENT' && 'Urgent announcements require immediate acknowledgment'}
              {priority === 'IMPORTANT' && 'Important announcements will be highlighted'}
              {priority === 'GENERAL' && 'General announcements for regular updates'}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter announcement title..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              disabled={submitting}
              maxLength={255}
            />
            <p className="text-sm text-gray-500 mt-1">{title.length}/255 characters</p>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter announcement content..."
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              disabled={submitting}
            />
            <p className="text-sm text-gray-500 mt-1">
              Provide detailed information about the announcement
            </p>
          </div>

          {/* Note about attachments */}
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-800">Note about attachments</p>
                <p className="text-sm text-blue-700 mt-1">
                  Existing attachments cannot be edited. To manage attachments, view the announcement and upload new files if needed.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting || !title.trim() || !content.trim()}
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Announcement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAnnouncementPage;
