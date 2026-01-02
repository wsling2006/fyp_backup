'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAllAnnouncements,
  acknowledgeAnnouncement,
  addReaction,
  Announcement,
  downloadAttachment,
} from '@/utils/announcementApi';
import UrgentAnnouncementModal from '@/components/UrgentAnnouncementModal';

const REACTIONS = ['👍', '❤️', '😮', '😢', '❗'];

const AnnouncementsPage: React.FC = () => {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'URGENT' | 'IMPORTANT' | 'GENERAL'>('ALL');

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await getAllAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      alert('Failed to load announcements');
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
    } catch (error) {
      console.error('Failed to download:', error);
      alert('Failed to download attachment');
    }
  };

  const filteredAnnouncements = announcements.filter((a) => {
    if (filter === 'ALL') return true;
    return a.priority === filter;
  });

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

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <UrgentAnnouncementModal />
      
      <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>
            <i className="bi bi-megaphone me-2"></i>
            Company Announcements
          </h2>
          <button className="btn btn-outline-secondary" onClick={loadAnnouncements}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>

        {/* Filter buttons */}
        <div className="btn-group mb-4" role="group">
          <button
            className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFilter('ALL')}
          >
            All
          </button>
          <button
            className={`btn ${filter === 'URGENT' ? 'btn-danger' : 'btn-outline-danger'}`}
            onClick={() => setFilter('URGENT')}
          >
            Urgent
          </button>
          <button
            className={`btn ${filter === 'IMPORTANT' ? 'btn-warning' : 'btn-outline-warning'}`}
            onClick={() => setFilter('IMPORTANT')}
          >
            Important
          </button>
          <button
            className={`btn ${filter === 'GENERAL' ? 'btn-secondary' : 'btn-outline-secondary'}`}
            onClick={() => setFilter('GENERAL')}
          >
            General
          </button>
        </div>

        {filteredAnnouncements.length === 0 && (
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            No announcements found.
          </div>
        )}

        {/* Announcements list */}
        {filteredAnnouncements.map((announcement) => (
          <div
            key={announcement.id}
            className={`card mb-3 ${!announcement.is_acknowledged && announcement.priority !== 'GENERAL' ? 'border-primary' : ''}`}
          >
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                {getPriorityBadge(announcement.priority)}
                <span className="ms-2 fw-bold">{announcement.title}</span>
              </div>
              {!announcement.is_acknowledged && (
                <span className="badge bg-danger">New</span>
              )}
            </div>
            <div className="card-body">
              <div style={{ whiteSpace: 'pre-wrap' }}>{announcement.content}</div>

              {/* Attachments */}
              {announcement.attachments && announcement.attachments.length > 0 && (
                <div className="mt-3">
                  <strong>📎 Attachments:</strong>
                  <ul className="list-unstyled mt-2">
                    {announcement.attachments.map((att: any) => (
                      <li key={att.id}>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleDownload(att.id, att.original_filename)}
                        >
                          <i className="bi bi-download me-1"></i>
                          {att.original_filename}
                          <span className="ms-2 text-muted">
                            ({(att.file_size / 1024).toFixed(1)} KB)
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reactions */}
              <div className="mt-3 d-flex gap-2 align-items-center">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    className={`btn btn-sm ${announcement.user_reaction === emoji ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => handleReaction(announcement.id, emoji)}
                  >
                    {emoji} {announcement.reaction_counts[emoji] || 0}
                  </button>
                ))}
                <button
                  className="btn btn-sm btn-outline-info ms-auto"
                  onClick={() => router.push(`/announcements/${announcement.id}`)}
                >
                  <i className="bi bi-chat-dots me-1"></i>
                  {announcement.comment_count} Comments
                </button>
              </div>

              <div className="mt-3 text-muted small">
                <i className="bi bi-person-circle me-1"></i>
                {announcement.author?.name || 'HR Department'}
                <span className="mx-2">•</span>
                <i className="bi bi-calendar me-1"></i>
                {new Date(announcement.created_at).toLocaleString()}
              </div>

              {!announcement.is_acknowledged && (
                <button
                  className="btn btn-success btn-sm mt-2"
                  onClick={() => handleAcknowledge(announcement.id)}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  Mark as Read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default AnnouncementsPage;
