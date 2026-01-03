import api from '../lib/api';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'URGENT' | 'IMPORTANT' | 'GENERAL';
  created_by: string;
  created_at: string;
  updated_at: string;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  reaction_counts: Record<string, number>;
  user_reaction: string | null;
  comment_count: number;
  author: {
    name: string;
    email: string;
  };
  attachments: Array<{
    id: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
  }>;
}

export interface Comment {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  user_email: string;
  created_at: string;
}

// Get all announcements
export const getAllAnnouncements = async (): Promise<Announcement[]> => {
  const { data } = await api.get('/announcements');
  return data;
};

// Get unacknowledged urgent announcements
export const getUnacknowledgedUrgent = async (): Promise<Announcement[]> => {
  const { data } = await api.get('/announcements/urgent/unacknowledged');
  return data;
};

// Create announcement (HR only)
export const createAnnouncement = async (announcement: {
  title: string;
  content: string;
  priority: string;
}) => {
  const { data } = await api.post('/announcements', announcement);
  return data;
};

// Update announcement (HR only)
export const updateAnnouncement = async (
  announcementId: string,
  announcement: {
    title?: string;
    content?: string;
    priority?: string;
  }
) => {
  const { data } = await api.put(`/announcements/${announcementId}`, announcement);
  return data;
};

// Delete announcement (HR only)
export const deleteAnnouncement = async (announcementId: string) => {
  const { data } = await api.delete(`/announcements/${announcementId}`);
  return data;
};

// Upload attachment (HR only)
export const uploadAttachment = async (announcementId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post(
    `/announcements/${announcementId}/attachments`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return data;
};

// Acknowledge announcement
export const acknowledgeAnnouncement = async (announcementId: string) => {
  const { data } = await api.post(`/announcements/${announcementId}/acknowledge`);
  return data;
};

// Add reaction
export const addReaction = async (announcementId: string, reactionType: string) => {
  const { data } = await api.post(`/announcements/${announcementId}/reactions`, {
    reaction_type: reactionType,
  });
  return data;
};

// Add comment
export const addComment = async (announcementId: string, content: string) => {
  const { data } = await api.post(`/announcements/${announcementId}/comments`, {
    content,
  });
  return data;
};

// Update comment
export const updateComment = async (announcementId: string, commentId: string, content: string) => {
  const { data } = await api.put(`/announcements/${announcementId}/comments/${commentId}`, {
    content,
  });
  return data;
};

// Delete comment
export const deleteComment = async (announcementId: string, commentId: string) => {
  const { data } = await api.delete(`/announcements/${announcementId}/comments/${commentId}`);
  return data;
};

// Get comments
export const getComments = async (announcementId: string): Promise<Comment[]> => {
  const { data } = await api.get(`/announcements/${announcementId}/comments`);
  return data;
};

// Download attachment (secure)
export const downloadAttachment = async (attachmentId: string, filename: string) => {
  const response = await api.get(
    `/announcements/attachments/${attachmentId}/download`,
    { responseType: 'blob' }
  );
  
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
