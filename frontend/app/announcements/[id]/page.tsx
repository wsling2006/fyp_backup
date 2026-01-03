'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  getAllAnnouncements,
  addComment,
  updateComment,
  deleteComment,
  getComments,
  addReaction,
  acknowledgeAnnouncement,
  downloadAttachment,
  Announcement,
  Comment,
} from '@/utils/announcementApi';

const REACTIONS = ['👍', '❤️', '😮', '😢', '❗'];

const AnnouncementDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const announcementId = params?.id as string;

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Check if current user is HR or Super Admin
  const isHRorAdmin = user && (user.role === 'human_resources' || user.role === 'super_admin');

  useEffect(() => {
    if (announcementId) {
      loadData();
    }
  }, [announcementId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const announcements = await getAllAnnouncements();
      const found = announcements.find((a: Announcement) => a.id === announcementId);
      setAnnouncement(found || null);

      const commentData = await getComments(announcementId);
      setComments(commentData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await addComment(announcementId, newComment);
      setNewComment('');
      loadData();
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment');
    }
    setSubmitting(false);
  };

  const handleEditComment = (commentId: string, content: string) => {
    setEditingCommentId(commentId);
    setEditingContent(content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingContent.trim()) {
      showToast('Comment cannot be empty', 'error');
      return;
    }

    try {
      await updateComment(commentId, editingContent);
      setEditingCommentId(null);
      setEditingContent('');
      showToast('Comment updated successfully!', 'success');
      loadData();
    } catch (error: any) {
      console.error('Failed to update comment:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update comment';
      showToast(errorMessage, 'error');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await deleteComment(commentId);
      showToast('Comment deleted successfully!', 'success');
      loadData();
    } catch (error: any) {
      console.error('Failed to delete comment:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete comment';
      showToast(errorMessage, 'error');
    }
  };

  const handleReaction = async (reactionType: string) => {
    try {
      await addReaction(announcementId, reactionType);
      loadData();
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleAcknowledge = async () => {
    try {
      await acknowledgeAnnouncement(announcementId);
      loadData();
    } catch (error) {
      console.error('Failed to acknowledge:', error);
    }
  };

  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      await downloadAttachment(attachmentId, filename);
    } catch (error) {
      console.error('Failed to download:', error);
      alert('Failed to download attachment');
    }
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
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Announcement Not Found</h3>
              <p className="text-red-700">The announcement you're looking for doesn't exist or has been removed.</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Go Back
        </button>
      </div>
    );
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
            🚨 URGENT
          </span>
        );
      case 'IMPORTANT':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
            ⚠️ IMPORTANT
          </span>
        );
      case 'GENERAL':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
            📢 GENERAL
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Back Button and Edit Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">Back to Announcements</span>
        </button>

        {/* Edit Button (HR/Admin only) */}
        {isHRorAdmin && announcement && (
          <button
            onClick={() => router.push(`/announcements/${announcementId}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Announcement
          </button>
        )}
      </div>

      {/* Announcement Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header with Priority Badge */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3 flex-wrap">
            {getPriorityBadge(announcement.priority)}
            {!announcement.is_acknowledged && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold animate-pulse">
                NEW
              </span>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{announcement.title}</h1>

          {/* Author & Date */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-medium">{announcement.author?.name || 'HR Department'}</span>
            </div>
            <span className="text-gray-400">•</span>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{new Date(announcement.created_at).toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
          </div>

          {/* Content */}
          <div className="prose max-w-none mb-6">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
              {announcement.content}
            </p>
          </div>

          {/* Attachments */}
          {announcement.attachments && announcement.attachments.length > 0 && (
            <div className="mb-6 bg-gray-50 rounded-lg p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-800">Attachments ({announcement.attachments.length})</h3>
              </div>
              <div className="space-y-2">
                {announcement.attachments.map((att: any) => (
                  <button
                    key={att.id}
                    onClick={() => handleDownload(att.id, att.original_filename)}
                    className="w-full flex items-center justify-between gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{att.original_filename}</p>
                        <p className="text-sm text-gray-500">{(att.file_size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reactions */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">React to this announcement</h3>
            <div className="flex flex-wrap gap-2">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    announcement.user_reaction === emoji
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }`}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-sm font-semibold">{announcement.reaction_counts[emoji] || 0}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Acknowledge Section */}
          {!announcement.is_acknowledged ? (
            <button
              onClick={handleAcknowledge}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Mark as Read
            </button>
          ) : (
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-green-800">Acknowledged</p>
                  <p className="text-sm text-green-700">
                    You marked this as read on {new Date(announcement.acknowledged_at!).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">💬 Comments</h3>
              <p className="text-sm text-gray-600">{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="mb-6">
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Add your comment
              </label>
              <textarea
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                rows={4}
                placeholder="Share your thoughts..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting || !newComment.trim()}
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Posting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Post Comment
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-700 mb-1">No comments yet</h4>
              <p className="text-gray-500">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <div key={comment.id} className={`${index !== comments.length - 1 ? 'border-b border-gray-200 pb-4' : ''}`}>
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {comment.user_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </div>

                    {/* Comment Content */}
                    <div className="flex-1 min-w-0">
                      <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800">
                            {comment.user_name || 'Unknown User'}
                          </span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                      </div>

                      {/* Edit & Delete Buttons (for own comments) */}
                      {user?.id === comment.user_id && (
                        <div className="flex gap-2 mt-2">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditComment(comment.id, comment.content)}
                            className="flex items-center gap-1 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-all shadow-md"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="flex items-center gap-1 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-all shadow-md"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Edit Comment Form (if editing) */}
                  {editingCommentId === comment.id && (
                    <div className="mt-4">
                      <textarea
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                        rows={3}
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => handleUpdateComment(comment.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetailPage;
