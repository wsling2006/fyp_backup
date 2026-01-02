'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  getAllAnnouncements,
  acknowledgeAnnouncement,
  addReaction,
  Announcement,
  downloadAttachment,
  deleteAnnouncement,
} from '@/utils/announcementApi';
import UrgentAnnouncementModal from '@/components/UrgentAnnouncementModal';

const REACTIONS = ['👍', '❤️', '😮', '😢', '❗'];

const AnnouncementsPage: React.FC = () => {
  const router = useRouter();
  const { user, isInitialized } = useAuth();
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'URGENT' | 'IMPORTANT' | 'GENERAL'>('ALL');

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.push('/login');
      return;
    }
    loadAnnouncements();
  }, [isInitialized, user, router]);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await getAllAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      showToast('Failed to load announcements. Please refresh the page.', 'error');
    }
    setLoading(false);
  };

  const handleAcknowledge = async (announcementId: string) => {
    try {
      await acknowledgeAnnouncement(announcementId);
      loadAnnouncements();
    } catch (error) {
      console.error('Failed to acknowledge:', error);
    }
  };

  const handleReaction = async (announcementId: string, reactionType: string) => {
    try {
      await addReaction(announcementId, reactionType);
      loadAnnouncements();
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      await downloadAttachment(attachmentId, filename);
      showToast(`📥 Downloaded ${filename}`, 'success');
    } catch (error) {
      console.error('Failed to download:', error);
      showToast('Failed to download attachment. Please try again.', 'error');
    }
  };

  const handleDelete = async (announcementId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteAnnouncement(announcementId);
      showToast('🗑️ Announcement deleted successfully', 'success');
      loadAnnouncements();
    } catch (error) {
      console.error('Failed to delete:', error);
      showToast('Failed to delete announcement. Please try again.', 'error');
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    if (filter === 'ALL') return true;
    return a.priority === filter;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            🚨 URGENT
          </span>
        );
      case 'IMPORTANT':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
            ⚠️ IMPORTANT
          </span>
        );
      case 'GENERAL':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-300">
            📢 GENERAL
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <UrgentAnnouncementModal />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
                📢 Company Announcements
              </h1>
              <p className="text-gray-600 mt-2">Stay updated with the latest company news</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Create Announcement Button - Only for HR and Super Admin */}
              {user && (user.role === 'human_resources' || user.role === 'super_admin') && (
                <button
                  onClick={() => router.push('/announcements/create')}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Announcement
                </button>
              )}
              <button
                onClick={loadAnnouncements}
                className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                filter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('URGENT')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                filter === 'URGENT'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              🚨 Urgent
            </button>
            <button
              onClick={() => setFilter('IMPORTANT')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                filter === 'IMPORTANT'
                  ? 'bg-yellow-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              ⚠️ Important
            </button>
            <button
              onClick={() => setFilter('GENERAL')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                filter === 'GENERAL'
                  ? 'bg-gray-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              📢 General
            </button>
          </div>

          {/* Empty State */}
          {filteredAnnouncements.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No announcements found</h3>
              <p className="text-gray-600">Check back later for updates</p>
            </div>
          )}

          {/* Announcements List */}
          <div className="space-y-6">
            {filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className={`bg-white rounded-xl shadow-sm border transition-all hover:shadow-md ${
                  !announcement.is_acknowledged && announcement.priority !== 'GENERAL'
                    ? 'border-blue-400 ring-2 ring-blue-100'
                    : 'border-gray-200'
                }`}
              >
                {/* Card Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    {getPriorityBadge(announcement.priority)}
                    <h3 className="text-xl font-bold text-gray-800">{announcement.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {!announcement.is_acknowledged && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                        New
                      </span>
                    )}
                    {/* Delete Button - Only for HR and Super Admin */}
                    {user && (user.role === 'human_resources' || user.role === 'super_admin') && (
                      <button
                        onClick={() => handleDelete(announcement.id, announcement.title)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                        title="Delete announcement"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <div className="text-gray-700 whitespace-pre-wrap mb-4">
                    {announcement.content}
                  </div>

                  {/* Attachments */}
                  {announcement.attachments && announcement.attachments.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="font-semibold text-gray-700 mb-3">📎 Attachments:</p>
                      <div className="space-y-2">
                        {announcement.attachments.map((att: any) => (
                          <button
                            key={att.id}
                            onClick={() => handleDownload(att.id, att.original_filename)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors w-full text-left"
                          >
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="font-medium text-gray-800">{att.original_filename}</span>
                            <span className="text-sm text-gray-500 ml-auto">
                              ({(att.file_size / 1024).toFixed(1)} KB)
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reactions */}
                  <div className="mt-6 flex flex-wrap gap-2 items-center">
                    {REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(announcement.id, emoji)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          announcement.user_reaction === emoji
                            ? 'bg-blue-100 text-blue-800 border-2 border-blue-400 shadow-sm'
                            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {emoji} {announcement.reaction_counts[emoji] || 0}
                      </button>
                    ))}
                    <button
                      onClick={() => router.push(`/announcements/${announcement.id}`)}
                      className="ml-auto flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="font-medium">{announcement.comment_count} Comments</span>
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="font-medium">{announcement.author?.email || 'HR Department'}</span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{new Date(announcement.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {!announcement.is_acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(announcement.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default AnnouncementsPage;
