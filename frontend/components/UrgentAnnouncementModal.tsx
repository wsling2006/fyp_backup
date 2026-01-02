import React, { useEffect, useState } from 'react';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white p-6">
          <h3 className="text-2xl font-bold flex items-center">
            <span className="text-3xl mr-3">⚠️</span>
            URGENT ANNOUNCEMENT
          </h3>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-96">
          <h5 className="text-xl font-bold mb-4">{current.title}</h5>
          <div
            className="mb-4 prose prose-sm max-w-none"
            style={{ whiteSpace: 'pre-wrap' }}
            dangerouslySetInnerHTML={{ __html: current.content }}
          />
          <div className="text-gray-600 text-sm flex items-center space-x-4">
            <span className="flex items-center">
              <span className="mr-1">👤</span>
              {current.author?.email || 'HR Department'}
            </span>
            <span className="flex items-center">
              <span className="mr-1">📅</span>
              {new Date(current.created_at).toLocaleString()}
            </span>
          </div>
          {current.attachments && current.attachments.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <strong className="text-sm font-semibold">Attachments:</strong>
              <ul className="mt-2 space-y-1">
                {current.attachments.map((att: any) => (
                  <li key={att.id} className="text-sm flex items-center">
                    <span className="mr-2">📎</span>
                    {att.original_filename}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {urgentAnnouncements.length > 1 && (
            <div className="mt-4 text-center">
              <span className="inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded-full text-sm font-medium">
                {currentIndex + 1} of {urgentAnnouncements.length} urgent announcements
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={handleAcknowledge}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
                       text-white font-semibold py-4 px-6 rounded-xl
                       shadow-lg hover:shadow-xl transition-all duration-300
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Acknowledging...</span>
              </>
            ) : (
              <>
                <span className="text-xl">✓</span>
                <span>I Acknowledge This Announcement</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UrgentAnnouncementModal;
