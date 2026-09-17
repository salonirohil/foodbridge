import React, { useEffect, useState } from 'react';
import { http } from '../api/http';
import { useAuth } from '../context/AuthContext';

export function MediaGallery() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'photo', 'video'
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Form states
  const [mediaType, setMediaType] = useState('photo');
  const [caption, setCaption] = useState('');
  const [file, setFile] = useState(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadMedia() {
    try {
      setLoading(true);
      const params = activeTab !== 'all' ? { type: activeTab } : {};
      const { data } = await http.get('/media', { params });
      setMediaItems(data);
    } catch (err) {
      setError('Could not load media gallery');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    loadMedia();
  }, [activeTab]);

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    setFile(selected || null);
    if (selected) {
      setPreviewUrl(URL.createObjectURL(selected));
      if (selected.type.startsWith('video/')) {
        setMediaType('video');
      } else {
        setMediaType('photo');
      }
    } else {
      setPreviewUrl('');
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file && !externalUrl) {
      setError('Please select a file or enter a media URL');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('type', mediaType);
      formData.append('caption', caption);
      if (file) formData.append('media', file);
      if (externalUrl) formData.append('externalUrl', externalUrl);

      await http.post('/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage('Media uploaded successfully!');
      setShowUploadModal(false);
      setCaption('');
      setFile(null);
      setExternalUrl('');
      setPreviewUrl('');
      loadMedia();
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this media item from gallery?')) return;
    try {
      await http.delete(`/media/${id}`);
      setMessage('Media item deleted');
      loadMedia();
    } catch (err) {
      setError('Could not delete media item');
    }
  }

  const photos = mediaItems.filter(item => item.type === 'photo');
  const videos = mediaItems.filter(item => item.type === 'video');

  return (
    <main className="info-page" style={{ paddingBottom: '72px' }}>
      <section className="info-hero" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #14532d 100%)', color: '#ffffff' }}>
        <div className="home-shell">
          <p className="eyebrow" style={{ color: '#86efac' }}>Community Showcase</p>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(2.2rem, 3.5vw, 3.2rem)' }}>FoodBridge Media Gallery</h1>
          <p style={{ color: 'rgba(226, 232, 240, 0.9)', maxWidth: '640px', margin: '0 auto 24px' }}>
            Photos and videos uploaded by verified Restaurants and NGOs documenting surplus food rescue, packaging, and community distribution.
          </p>

          {user && (user.role === 'restaurant' || user.role === 'ngo' || user.role === 'admin') && (
            <button className="primary" style={{ padding: '10px 24px', fontSize: '15px', fontWeight: '700' }} onClick={() => setShowUploadModal(true)}>
              + Upload Photo / Video
            </button>
          )}
        </div>
      </section>

      <section className="info-section">
        <div className="home-shell">
          {message && (
            <p className="notice" style={{ marginBottom: '24px' }}>
              <span>{message}</span>
              <button type="button" onClick={() => setMessage('')} aria-label="Close message">&times;</button>
            </p>
          )}
          {error && (
            <p className="error" style={{ marginBottom: '24px' }}>
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} aria-label="Close error">&times;</button>
            </p>
          )}

          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '36px', flexWrap: 'wrap' }}>
            <button className={activeTab === 'all' ? 'primary' : ''} onClick={() => setActiveTab('all')}>
              All Gallery ({mediaItems.length})
            </button>
            <button className={activeTab === 'photo' ? 'primary' : ''} onClick={() => setActiveTab('photo')}>
              📷 Photo Gallery ({photos.length})
            </button>
            <button className={activeTab === 'video' ? 'primary' : ''} onClick={() => setActiveTab('video')}>
              🎥 Video Gallery ({videos.length})
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
              <p>Loading media items...</p>
            </div>
          ) : (
            <div>
              {/* Media Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {mediaItems.map(item => (
                  <article className="card" key={item.id} style={{ overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' }}>
                    {item.type === 'photo' ? (
                      <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setSelectedImage(item.url)}>
                        <img src={item.url} alt={item.caption || 'Gallery photo'} style={{ width: '100%', height: '230px', objectFit: 'cover' }} />
                        <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(15, 23, 42, 0.75)', color: '#fff', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>
                          📷 PHOTO
                        </span>
                      </div>
                    ) : (
                      <div style={{ position: 'relative', background: '#0f172a' }}>
                        <video controls preload="metadata" src={item.url} style={{ width: '100%', height: '230px', objectFit: 'cover' }} />
                        <span style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700' }}>
                          🎥 VIDEO
                        </span>
                      </div>
                    )}

                    <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          {item.user_profile_image ? (
                            <img src={item.user_profile_image} alt={item.user_name} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '12px' }}>
                              {(item.user_name || 'U').slice(0, 1)}
                            </div>
                          )}
                          <div>
                            <strong style={{ fontSize: '13px', display: 'block', color: '#0f172a' }}>{item.user_name}</strong>
                            <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>{item.user_role === 'ngo' ? 'NGO Partner' : 'Restaurant Donor'}</span>
                          </div>
                        </div>
                        {item.caption && <p style={{ color: '#334155', fontSize: '14px', lineHeight: '1.5', marginTop: '6px' }}>{item.caption}</p>}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#94a3b8', fontSize: '11px' }}>{new Date(item.created_at).toLocaleDateString()}</span>
                        {user && (user.id === item.user_id || user.role === 'admin') && (
                          <button onClick={() => handleDelete(item.id)} className="danger" style={{ padding: '3px 8px', fontSize: '11px' }}>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {mediaItems.length === 0 && (
                <div className="card" style={{ textAlignment: 'center', padding: '48px', margin: '24px 0', textAlign: 'center' }}>
                  <h3>No media uploads found</h3>
                  <p style={{ color: '#64748b' }}>Be the first organization to share photos or videos of surplus food donations!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={handleUpload}>
            <button type="button" onClick={() => setShowUploadModal(false)} className="close-btn">&times;</button>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Upload Gallery Media</h2>

            <label>Media Type
              <select value={mediaType} onChange={e => setMediaType(e.target.value)}>
                <option value="photo">Photo Image</option>
                <option value="video">Video Clip</option>
              </select>
            </label>

            <label>Select File (Image or Video)
              <input type="file" accept={mediaType === 'photo' ? 'image/*' : 'video/*,image/*'} onChange={handleFileChange} />
            </label>

            {previewUrl && (
              <div style={{ marginBottom: '16px' }}>
                {mediaType === 'photo' ? (
                  <img src={previewUrl} alt="Upload preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '12px' }} />
                ) : (
                  <video controls src={previewUrl} style={{ width: '100%', maxHeight: '200px', borderRadius: '12px' }} />
                )}
              </div>
            )}

            <label>Or Media URL (Optional)
              <input type="url" value={externalUrl} onChange={e => setExternalUrl(e.target.value)} placeholder="https://example.com/media.jpg" />
            </label>

            <label>Caption / Title Description
              <textarea rows="3" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Describe the food donation, event, or partner activity..." />
            </label>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button type="submit" className="primary" disabled={submitting} style={{ flex: 1 }}>
                {submitting ? 'Uploading...' : 'Publish to Gallery'}
              </button>
              <button type="button" onClick={() => setShowUploadModal(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={selectedImage} alt="Full view" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '16px', objectFit: 'contain' }} />
            <button onClick={() => setSelectedImage(null)} style={{ position: 'absolute', top: '-16px', right: '-16px', background: '#ffffff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '18px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>&times;</button>
          </div>
        </div>
      )}
    </main>
  );
}
