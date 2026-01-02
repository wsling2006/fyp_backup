'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAnnouncement, uploadAttachment } from '../../utils/announcementApi';

const CreateAnnouncementPage: React.FC = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'GENERAL',
  });
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">
                <i className="bi bi-megaphone-fill me-2"></i>
                Create New Announcement
              </h4>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Title */}
                <div className="mb-3">
                  <label className="form-label fw-bold">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    maxLength={255}
                    placeholder="Enter announcement title"
                  />
                </div>

                {/* Priority */}
                <div className="mb-3">
                  <label className="form-label fw-bold">Priority Level *</label>
                  <select
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                    required
                  >
                    <option value="GENERAL">📢 General (Normal announcement)</option>
                    <option value="IMPORTANT">⚠️ Important (Red dot indicator)</option>
                    <option value="URGENT">🚨 Urgent (Blocking popup)</option>
                  </select>
                  <div className="form-text">
                    {formData.priority === 'URGENT' && (
                      <span className="text-danger">
                        <i className="bi bi-exclamation-triangle-fill me-1"></i>
                        <strong>Urgent:</strong> Will show blocking modal to all users on next login
                      </span>
                    )}
                    {formData.priority === 'IMPORTANT' && (
                      <span className="text-warning">
                        <i className="bi bi-info-circle-fill me-1"></i>
                        <strong>Important:</strong> Will show red dot indicator until acknowledged
                      </span>
                    )}
                    {formData.priority === 'GENERAL' && (
                      <span className="text-muted">
                        <strong>General:</strong> Normal announcement, no special notification
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="mb-3">
                  <label className="form-label fw-bold">Content *</label>
                  <textarea
                    className="form-control"
                    rows={8}
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    required
                    placeholder="Enter announcement content"
                  />
                </div>

                {/* Attachments */}
                <div className="mb-3">
                  <label className="form-label fw-bold">
                    Attachments (Optional)
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    multiple
                    onChange={(e) => setFiles(e.target.files)}
                  />
                  <div className="form-text">
                    <i className="bi bi-shield-check me-1"></i>
                    <strong>Security:</strong> Documents, images, and archives are allowed.
                    Executable files (.exe, .bat, .js, etc.) are blocked.
                    Max 20MB per file. All files scanned for malware.
                  </div>
                  {files && files.length > 0 && (
                    <div className="mt-2">
                      <strong>Selected files:</strong>
                      <ul className="list-unstyled mt-1">
                        {Array.from(files).map((file, idx) => (
                          <li key={idx}>
                            <i className="bi bi-paperclip me-1"></i>
                            {file.name} ({(file.size / 1024).toFixed(1)} KB)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Create Announcement
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Security Info Card */}
          <div className="card mt-3">
            <div className="card-header bg-info text-white">
              <i className="bi bi-shield-fill-check me-2"></i>
              Security & File Upload Policy
            </div>
            <div className="card-body">
              <h6 className="text-success">✅ Allowed File Types:</h6>
              <ul className="small">
                <li>Documents: PDF, Word, Excel, PowerPoint</li>
                <li>Images: JPEG, PNG, GIF, WebP, SVG</li>
                <li>Archives: ZIP, RAR, 7z, TAR, GZIP</li>
                <li>Text: TXT, CSV</li>
              </ul>
              <h6 className="text-danger">❌ Blocked File Types:</h6>
              <ul className="small">
                <li>Executables: .exe, .bat, .cmd, .sh, .ps1, .js, .vbs, .jar, .apk, .msi, .dll</li>
              </ul>
              <h6 className="text-primary">🔒 Security Measures:</h6>
              <ul className="small">
                <li>MIME type validation (whitelist-based)</li>
                <li>File extension validation</li>
                <li>ClamAV antivirus scanning on every file</li>
                <li>SHA-256 hashing for duplicate detection</li>
                <li>Maximum file size: 20MB</li>
                <li>Secure database storage (no direct filesystem access)</li>
                <li>Forced download (no inline execution)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAnnouncementPage;
