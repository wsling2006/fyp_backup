import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import {
  getUnacknowledgedUrgent,
  acknowledgeAnnouncement,
  Announcement,
} from '../utils/announcementApi';

const UrgentAnnouncementModal: React.FC = () => {
  const [urgentAnnouncements, setUrgentAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUrgentAnnouncements();
  }, []);

  const loadUrgentAnnouncements = async () => {
    try {
      const announcements = await getUnacknowledgedUrgent();
      setUrgentAnnouncements(announcements);
    } catch (error) {
      console.error('Failed to load urgent announcements:', error);
    }
  };

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      const current = urgentAnnouncements[currentIndex];
      await acknowledgeAnnouncement(current.id);
      
      // Move to next or close
      if (currentIndex < urgentAnnouncements.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setUrgentAnnouncements([]);
      }
    } catch (error) {
      console.error('Failed to acknowledge announcement:', error);
      alert('Failed to acknowledge announcement');
    }
    setLoading(false);
  };

  if (urgentAnnouncements.length === 0) {
    return null;
  }

  const current = urgentAnnouncements[currentIndex];

  return (
    <Modal
      show={true}
      backdrop="static"
      keyboard={false}
      centered
      size="lg"
    >
      <Modal.Header className="bg-danger text-white">
        <Modal.Title>
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          URGENT ANNOUNCEMENT
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h5 className="mb-3">{current.title}</h5>
        <div
          className="mb-3"
          style={{ whiteSpace: 'pre-wrap' }}
          dangerouslySetInnerHTML={{ __html: current.content }}
        />
        <div className="text-muted small">
          <i className="bi bi-person-circle me-1"></i>
          {current.author?.name || 'HR Department'}
          <span className="mx-2">•</span>
          <i className="bi bi-calendar me-1"></i>
          {new Date(current.created_at).toLocaleString()}
        </div>
        {current.attachments && current.attachments.length > 0 && (
          <div className="mt-3">
            <strong>Attachments:</strong>
            <ul className="list-unstyled mt-2">
              {current.attachments.map((att) => (
                <li key={att.id}>
                  <i className="bi bi-paperclip me-1"></i>
                  {att.original_filename}
                </li>
              ))}
            </ul>
          </div>
        )}
        {urgentAnnouncements.length > 1 && (
          <div className="mt-3 text-center">
            <span className="badge bg-secondary">
              {currentIndex + 1} of {urgentAnnouncements.length} urgent announcements
            </span>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="primary"
          onClick={handleAcknowledge}
          disabled={loading}
          size="lg"
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Acknowledging...
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-2"></i>
              I Acknowledge This Announcement
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UrgentAnnouncementModal;
