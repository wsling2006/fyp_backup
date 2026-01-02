'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getAllAnnouncements,
  addComment,
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
  const announcementId = params?.id as string;

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Announcement not found
        </div>
        <button className="btn btn-secondary" onClick={() => router.back()}>
          Go Back
        </button>
      </div>
    );
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="badge bg-danger">🚨 URGENT</span>;
      case 'IMPORTANT':
        return <span className="badge bg-warning text-dark">⚠️ IMPORTANT</span>;
      case 'GENERAL':
        return <span className="badge bg-secondary">📢 GENERAL</span>;
      default:
        return null;
    }
  };

  return (
    <div className="container mt-4">
      <button className="btn btn-sm btn-outline-secondary mb-3" onClick={() => router.back()}>
        <i className="bi bi-arrow-left me-1"></i>
        Back
      </button>

      {/* Announcement Card */}
      <div className="card mb-4">
        <div className="card-header">
          {getPriorityBadge(announcement.priority)}
          {!announcement.is_acknowledged && (
            <span className="badge bg-danger ms-2">New</span>
          )}
        </div>
        <div className="card-body">
          <h3 className="mb-3">{announcement.title}</h3>
          <div style={{ whiteSpace: 'pre-wrap' }} className="mb-4">
            {announcement.content}
          </div>

          {/* Attachments */}
          {announcement.attachments && announcement.attachments.length > 0 && (
            <div className="mb-4">
              <h5>📎 Attachments</h5>
              <div className="list-group">
                {announcement.attachments.map((att: any) => (
                  <button
                    key={att.id}
                    className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                    onClick={() => handleDownload(att.id, att.original_filename)}
                  >
                    <div>
                      <i className="bi bi-file-earmark me-2"></i>
                      {att.original_filename}
                      <span className="text-muted small ms-2">
                        ({(att.file_size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <i className="bi bi-download"></i>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Author & Date */}
          <div className="text-muted small mb-3">
            <i className="bi bi-person-circle me-1"></i>
            {announcement.author?.name || 'HR Department'}
            <span className="mx-2">•</span>
            <i className="bi bi-calendar me-1"></i>
            {new Date(announcement.created_at).toLocaleString()}
          </div>

          {/* Reactions */}
          <div className="d-flex gap-2 mb-3">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                className={`btn btn-sm ${announcement.user_reaction === emoji ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => handleReaction(emoji)}
              >
                {emoji} {announcement.reaction_counts[emoji] || 0}
              </button>
            ))}
          </div>

          {/* Acknowledge button */}
          {!announcement.is_acknowledged && (
            <button className="btn btn-success" onClick={handleAcknowledge}>
              <i className="bi bi-check-circle me-2"></i>
              Mark as Read
            </button>
          )}
          {announcement.is_acknowledged && (
            <div className="alert alert-success">
              <i className="bi bi-check-circle-fill me-2"></i>
              You acknowledged this announcement on{' '}
              {new Date(announcement.acknowledged_at!).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-chat-dots me-2"></i>
            Comments ({comments.length})
          </h5>
        </div>
        <div className="card-body">
          {/* Add comment form */}
          <form onSubmit={handleAddComment} className="mb-4">
            <div className="mb-2">
              <textarea
                className="form-control"
                rows={3}
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={submitting}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Posting...
                </>
              ) : (
                <>
                  <i className="bi bi-send me-2"></i>
                  Post Comment
                </>
              )}
            </button>
          </form>

          {/* Comments list */}
          {comments.length === 0 && (
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2"></i>
              No comments yet. Be the first to comment!
            </div>
          )}

          {comments.map((comment) => (
            <div key={comment.id} className="border-bottom pb-3 mb-3">
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="fw-bold">
                    <i className="bi bi-person-circle me-1"></i>
                    {comment.user_name}
                  </div>
                  <div className="text-muted small mb-2">
                    {new Date(comment.created_at).toLocaleString()}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{comment.content}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetailPage;
