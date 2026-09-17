import React, { useEffect, useState } from 'react';
import { http } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { 
  DashboardIcon, UsersIcon, FoodIcon, ClaimIcon, ReviewIcon, 
  ReportIcon, AnalyticsIcon, NotificationIcon, SettingsIcon, CmsIcon, 
  SystemLogsIcon, ProfileIcon, LogoutIcon, VerifiedBadgeIcon 
} from '../components/Icons';
import { LineChart, DoughnutChart } from '../components/Charts';

const cmsSections = [
  { key: 'website', label: 'Website' },
  { key: 'about', label: 'About Page' },
  { key: 'howItWorks', label: 'How It Works' },
  { key: 'impact', label: 'Impact Page' },
  { key: 'contact', label: 'Contact Page' },
  { key: 'profile', label: 'Profile Page' },
  { key: 'policy', label: 'Policy Page' }
];

function cloneCms(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

export function AdminDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState({
    cards: { totalRestaurants: 0, totalNgos: 0, totalFoodPosts: 0, foodSavedKg: 0, mealsServed: 0 },
    weeklyPostedKg: [0, 0, 0, 0, 0, 0, 0],
    categoryShare: []
  });
  const [users, setUsers] = useState([]);
  const [foods, setFoods] = useState([]);
  const [claims, setClaims] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reports, setReports] = useState({ auditLogs: [], openReports: [] });
  const [cmsSettings, setCmsSettings] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeCmsSection, setActiveCmsSection] = useState('website');
  const [cmsDraft, setCmsDraft] = useState({});

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

  async function loadDashboard() {
    try {
      const { data: dashboard } = await http.get('/admin/dashboard');
      setData(dashboard);
    } catch (err) {}
  }

  async function loadUsers() {
    try {
      const { data: rows } = await http.get('/admin/users', { params: { search: searchQuery } });
      setUsers(rows);
    } catch (err) {}
  }

  async function loadFoods() {
    try {
      const { data: rows } = await http.get('/admin/foods', { params: { search: searchQuery } });
      setFoods(rows);
    } catch (err) {}
  }

  async function loadClaims() {
    try {
      const { data: rows } = await http.get('/admin/claims');
      setClaims(rows);
    } catch (err) {}
  }

  async function loadReviews() {
    try {
      const { data: rows } = await http.get('/admin/reviews');
      setReviews(rows);
    } catch (err) {}
  }

  async function loadReports() {
    try {
      const { data: rows } = await http.get('/admin/reports');
      setReports(rows);
    } catch (err) {}
  }

  async function loadCmsSettings() {
    try {
      const { data: rows } = await http.get('/admin/settings/cms');
      setCmsSettings(rows);
      setCmsDraft({
        ...cloneCms(rows),
        impact: {
          ...(rows.impact || {}),
          successStories: JSON.stringify(rows.impact?.successStories || [], null, 2)
        }
      });
    } catch (err) {}
  }

  useEffect(() => {
    loadDashboard();
    loadUsers();
    loadFoods();
    loadClaims();
    loadReviews();
    loadReports();
    loadCmsSettings();
  }, [activeTab, searchQuery]);

  // Admin user approvals
  async function verifyUser(id, action) {
    try {
      await http.patch(`/admin/users/${id}/${action}`);
      setMessage(`User successfully ${action}d.`);
      loadUsers();
      loadDashboard();
    } catch (err) {
      setError('Action failed');
    }
  }

  async function deleteUser(id) {
    if (!window.confirm('Delete user and all related data?')) return;
    try {
      await http.delete(`/admin/users/${id}`);
      setMessage('User deleted successfully');
      loadUsers();
    } catch (err) {
      setError('Delete failed');
    }
  }

  // Food controls
  async function markFoodUnsafe(id) {
    try {
      await http.patch(`/admin/foods/${id}/unsafe`);
      setMessage('Food marked unsafe and status set to cancelled');
      loadFoods();
    } catch (err) {
      setError('Action failed');
    }
  }

  async function deleteFood(id) {
    if (!window.confirm('Delete this food post?')) return;
    try {
      await http.delete(`/admin/foods/${id}`);
      setMessage('Food post deleted');
      loadFoods();
    } catch (err) {
      setError('Delete failed');
    }
  }

  async function clearExpiredFoods() {
    try {
      const { data: res } = await http.delete('/admin/foods/expired/remove');
      setMessage(res.message);
      loadFoods();
    } catch (err) {
      setError('Clear failed');
    }
  }

  // Claim controls
  async function updateClaim(id, status) {
    try {
      await http.patch(`/admin/claims/${id}/status`, { status });
      setMessage('Claim status updated');
      loadClaims();
    } catch (err) {
      setError('Action failed');
    }
  }

  // Review deletion
  async function deleteReview(id) {
    if (!window.confirm('Delete this review?')) return;
    try {
      await http.delete(`/admin/reviews/${id}`);
      setMessage('Review deleted');
      loadReviews();
    } catch (err) {
      setError('Could not delete review');
    }
  }

  function updateCmsField(section, key, value) {
    setCmsDraft(current => ({
      ...current,
      [section]: {
        ...(current[section] || {}),
        [key]: value
      }
    }));
  }

  function appendCmsMediaValue(section, key, file) {
    if (!file) return;

    const formData = new FormData();
    formData.append('media', file);

    http.post('/admin/settings/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(({ data: payload }) => {
      setCmsDraft(current => {
        const currentValue = current?.[section]?.[key] || '';
        const values = String(currentValue)
          .split(/\r?\n|,/)
          .map(item => item.trim())
          .filter(Boolean);

        if (payload.url && !values.includes(payload.url)) {
          values.push(payload.url);
        }

        return {
          ...current,
          [section]: {
            ...(current[section] || {}),
            [key]: values.join('\n')
          }
        };
      });
      setMessage('Media uploaded. Save changes to publish it on the website.');
    }).catch(() => {
      setError('Could not upload media');
    });
  }

  async function uploadCmsMedia(section, key, file) {
    if (!file) return;

    const formData = new FormData();
    formData.append('media', file);

    try {
      const { data: payload } = await http.post('/admin/settings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateCmsField(section, key, payload.url);
      setMessage('Media uploaded. Save changes to publish it on the website.');
    } catch (err) {
      setError('Could not upload media');
    }
  }

  // CMS update
  async function saveCmsSection(section) {
    let payload = cloneCms(cmsDraft[section]);

    if (section === 'impact') {
      try {
        payload.successStories = JSON.parse(payload.successStories || '[]');
      } catch (err) {
        setError('Impact success stories must be valid JSON array data.');
        return;
      }
    }

    try {
      await http.put(`/admin/settings/cms/${section}`, payload);
      setMessage('CMS section updated successfully');
      loadCmsSettings();
    } catch (err) {
      setError('Could not update CMS content.');
    }
  }

  // Analytics CSV Export
  function exportCsv(type) {
    let headers = [];
    let rows = [];
    let filename = '';

    if (type === 'users') {
      headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Verified', 'Created At'];
      rows = users.map(u => [u.id, u.name, u.email, u.role, u.account_status, u.is_verified, u.created_at]);
      filename = 'users_report';
    } else if (type === 'foods') {
      headers = ['ID', 'Name', 'Restaurant Name', 'Quantity', 'Status', 'Expiry'];
      rows = foods.map(f => [f.id, f.name, f.restaurant_name, f.quantity_kg, f.status, f.expiry_time]);
      filename = 'foods_report';
    } else {
      headers = ['ID', 'Food Name', 'NGO Name', 'Status', 'Claimed Date'];
      rows = claims.map(c => [c.id, c.food_id, c.ngo_id, c.status, c.claimed_at]);
      filename = 'claims_report';
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function renderCmsEditor() {
    const section = activeCmsSection;
    const values = cmsDraft[section] || {};

    if (section === 'website') {
      return (
        <div style={{ display: 'grid', gap: '18px' }}>
          <div className="two-column">
            <div>
              <label>Website Name</label>
              <input value={values.websiteName || ''} onChange={e => updateCmsField(section, 'websiteName', e.target.value)} />
            </div>
            <div>
              <label>Support Email</label>
              <input value={values.supportEmail || ''} onChange={e => updateCmsField(section, 'supportEmail', e.target.value)} />
            </div>
          </div>
          <div className="two-column">
            <div>
              <label>Support Phone</label>
              <input value={values.supportPhone || ''} onChange={e => updateCmsField(section, 'supportPhone', e.target.value)} />
            </div>
            <div>
              <label>Website Address</label>
              <input value={values.websiteAddress || ''} onChange={e => updateCmsField(section, 'websiteAddress', e.target.value)} />
            </div>
          </div>
          <div>
            <label>Website Description</label>
            <textarea value={values.websiteDescription || ''} onChange={e => updateCmsField(section, 'websiteDescription', e.target.value)} />
          </div>
          <div className="two-column">
            <div>
              <label>Facebook</label>
              <input value={values.facebook || ''} onChange={e => updateCmsField(section, 'facebook', e.target.value)} />
            </div>
            <div>
              <label>Instagram</label>
              <input value={values.instagram || ''} onChange={e => updateCmsField(section, 'instagram', e.target.value)} />
            </div>
          </div>
          <div className="two-column">
            <div>
              <label>LinkedIn</label>
              <input value={values.linkedin || ''} onChange={e => updateCmsField(section, 'linkedin', e.target.value)} />
            </div>
            <div>
              <label>Homepage Video URL</label>
              <input value={values.homeVideoUrl || ''} onChange={e => updateCmsField(section, 'homeVideoUrl', e.target.value)} />
              <input type="file" accept="video/*" onChange={e => uploadCmsMedia(section, 'homeVideoUrl', e.target.files?.[0])} />
            </div>
          </div>
          <div className="two-column">
            <div>
              <label>Homepage Image 1</label>
              <input value={values.homeImage1Url || ''} onChange={e => updateCmsField(section, 'homeImage1Url', e.target.value)} />
              <input type="file" accept="image/*" onChange={e => uploadCmsMedia(section, 'homeImage1Url', e.target.files?.[0])} />
              {values.homeImage1Url && <img className="image-preview" src={values.homeImage1Url} alt="Homepage visual 1" />}
            </div>
            <div>
              <label>Homepage Image 1 Description</label>
              <textarea value={values.homeImage1Description || ''} onChange={e => updateCmsField(section, 'homeImage1Description', e.target.value)} />
            </div>
          </div>
          <div className="two-column">
            <div>
              <label>Homepage Image 2</label>
              <input value={values.homeImage2Url || ''} onChange={e => updateCmsField(section, 'homeImage2Url', e.target.value)} />
              <input type="file" accept="image/*" onChange={e => uploadCmsMedia(section, 'homeImage2Url', e.target.files?.[0])} />
              {values.homeImage2Url && <img className="image-preview" src={values.homeImage2Url} alt="Homepage visual 2" />}
            </div>
            <div>
              <label>Homepage Image 2 Description</label>
              <textarea value={values.homeImage2Description || ''} onChange={e => updateCmsField(section, 'homeImage2Description', e.target.value)} />
            </div>
          </div>
        </div>
      );
    }

    if (section === 'about') {
      return (
        <div style={{ display: 'grid', gap: '18px' }}>
          <div className="two-column">
            <div>
              <label>Hero Title</label>
              <input value={values.heroTitle || ''} onChange={e => updateCmsField(section, 'heroTitle', e.target.value)} />
            </div>
            <div>
              <label>Video URL</label>
              <input value={values.videoUrl || ''} onChange={e => updateCmsField(section, 'videoUrl', e.target.value)} />
              <input type="file" accept="video/*" onChange={e => uploadCmsMedia(section, 'videoUrl', e.target.files?.[0])} />
            </div>
          </div>
          <div>
            <label>Hero Description</label>
            <textarea value={values.heroDescription || ''} onChange={e => updateCmsField(section, 'heroDescription', e.target.value)} />
          </div>
          <div className="two-column">
            <div>
              <label>Mission</label>
              <textarea value={values.mission || ''} onChange={e => updateCmsField(section, 'mission', e.target.value)} />
            </div>
            <div>
              <label>Vision</label>
              <textarea value={values.vision || ''} onChange={e => updateCmsField(section, 'vision', e.target.value)} />
            </div>
          </div>
          <div>
            <label>Our Story</label>
            <textarea value={values.ourStory || ''} onChange={e => updateCmsField(section, 'ourStory', e.target.value)} />
          </div>
          <div className="two-column">
            <div>
              <label>Team Members</label>
              <textarea value={values.teamMembers || ''} onChange={e => updateCmsField(section, 'teamMembers', e.target.value)} />
            </div>
            <div>
              <label>Statistics</label>
              <textarea value={values.statistics || ''} onChange={e => updateCmsField(section, 'statistics', e.target.value)} />
            </div>
          </div>
          <div>
            <label>About Page Images</label>
            <textarea value={values.images || ''} onChange={e => updateCmsField(section, 'images', e.target.value)} placeholder="Paste image URLs separated by new lines or commas" />
            <input type="file" accept="image/*" onChange={e => appendCmsMediaValue(section, 'images', e.target.files?.[0])} />
          </div>
        </div>
      );
    }

    if (section === 'howItWorks') {
      return (
        <div style={{ display: 'grid', gap: '18px' }}>
          <div className="two-column">
            <div>
              <label>Hero Title</label>
              <input value={values.heroTitle || ''} onChange={e => updateCmsField(section, 'heroTitle', e.target.value)} />
            </div>
            <div>
              <label>Video URL</label>
              <input value={values.videoUrl || ''} onChange={e => updateCmsField(section, 'videoUrl', e.target.value)} />
              <input type="file" accept="video/*" onChange={e => uploadCmsMedia(section, 'videoUrl', e.target.files?.[0])} />
            </div>
          </div>
          <div>
            <label>Hero Description</label>
            <textarea value={values.heroDescription || ''} onChange={e => updateCmsField(section, 'heroDescription', e.target.value)} />
          </div>
          <div className="two-column">
            <div>
              <label>Restaurant Steps</label>
              <textarea value={values.restaurantSteps || ''} onChange={e => updateCmsField(section, 'restaurantSteps', e.target.value)} />
            </div>
            <div>
              <label>NGO Steps</label>
              <textarea value={values.ngoSteps || ''} onChange={e => updateCmsField(section, 'ngoSteps', e.target.value)} />
            </div>
          </div>
          <div>
            <label>Admin Steps</label>
            <textarea value={values.adminSteps || ''} onChange={e => updateCmsField(section, 'adminSteps', e.target.value)} />
          </div>
          <div>
            <label>Support Images</label>
            <textarea value={values.images || ''} onChange={e => updateCmsField(section, 'images', e.target.value)} placeholder="Paste image URLs separated by new lines or commas" />
            <input type="file" accept="image/*" onChange={e => appendCmsMediaValue(section, 'images', e.target.files?.[0])} />
          </div>
        </div>
      );
    }

    if (section === 'impact') {
      return (
        <div style={{ display: 'grid', gap: '18px' }}>
          <div className="two-column">
            <div>
              <label>Total Food Saved (kg)</label>
              <input value={values.totalFoodSavedKg || ''} onChange={e => updateCmsField(section, 'totalFoodSavedKg', e.target.value)} />
            </div>
            <div>
              <label>Meals Served</label>
              <input value={values.mealsServed || ''} onChange={e => updateCmsField(section, 'mealsServed', e.target.value)} />
            </div>
          </div>
          <div className="two-column">
            <div>
              <label>Active Restaurants</label>
              <input value={values.activeRestaurants || ''} onChange={e => updateCmsField(section, 'activeRestaurants', e.target.value)} />
            </div>
            <div>
              <label>Active NGOs</label>
              <input value={values.activeNgos || ''} onChange={e => updateCmsField(section, 'activeNgos', e.target.value)} />
            </div>
          </div>
          <div className="two-column">
            <div>
              <label>Cities Covered</label>
              <input value={values.citiesCovered || ''} onChange={e => updateCmsField(section, 'citiesCovered', e.target.value)} />
            </div>
            <div>
              <label>Volunteers</label>
              <input value={values.volunteers || ''} onChange={e => updateCmsField(section, 'volunteers', e.target.value)} />
            </div>
          </div>
          <div className="two-column">
            <div>
              <label>CO2 Saved</label>
              <input value={values.co2Saved || ''} onChange={e => updateCmsField(section, 'co2Saved', e.target.value)} />
            </div>
            <div>
              <label>Success Stories JSON</label>
              <textarea value={values.successStories || '[]'} onChange={e => updateCmsField(section, 'successStories', e.target.value)} />
            </div>
          </div>
        </div>
      );
    }

    if (section === 'profile') {
      return (
        <div style={{ display: 'grid', gap: '18px' }}>
          <div className="two-column">
            <div>
              <label>Hero Title</label>
              <input value={values.heroTitle || ''} onChange={e => updateCmsField(section, 'heroTitle', e.target.value)} />
            </div>
            <div>
              <label>Hero Description</label>
              <input value={values.heroDescription || ''} onChange={e => updateCmsField(section, 'heroDescription', e.target.value)} />
            </div>
          </div>
          <div>
            <label>Guidelines & Instructions</label>
            <textarea value={values.guidelinesText || ''} onChange={e => updateCmsField(section, 'guidelinesText', e.target.value)} placeholder="Guidelines shown on user profile edit panels" />
          </div>
          <div>
            <label>Privacy & Security Note</label>
            <textarea value={values.privacyNote || ''} onChange={e => updateCmsField(section, 'privacyNote', e.target.value)} />
          </div>
        </div>
      );
    }

    if (section === 'policy') {
      return (
        <div style={{ display: 'grid', gap: '18px' }}>
          <div className="two-column">
            <div>
              <label>Policy Hero Title</label>
              <input value={values.heroTitle || ''} onChange={e => updateCmsField(section, 'heroTitle', e.target.value)} />
            </div>
            <div>
              <label>Policy Hero Description</label>
              <input value={values.heroDescription || ''} onChange={e => updateCmsField(section, 'heroDescription', e.target.value)} />
            </div>
          </div>
          <div>
            <label>Food Safety Guidelines</label>
            <textarea value={values.foodSafetyRules || ''} onChange={e => updateCmsField(section, 'foodSafetyRules', e.target.value)} placeholder="Enumerate safety rules line by line..." style={{ minHeight: '120px' }} />
          </div>
          <div>
            <label>NGO Collection Protocols</label>
            <textarea value={values.ngoGuidelines || ''} onChange={e => updateCmsField(section, 'ngoGuidelines', e.target.value)} placeholder="Enumerate NGO collection guidelines..." style={{ minHeight: '100px' }} />
          </div>
          <div>
            <label>Terms of Service & Enforcement</label>
            <textarea value={values.termsOfService || ''} onChange={e => updateCmsField(section, 'termsOfService', e.target.value)} style={{ minHeight: '100px' }} />
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'grid', gap: '18px' }}>
        <div className="two-column">
          <div>
            <label>Email</label>
            <input value={values.email || ''} onChange={e => updateCmsField(section, 'email', e.target.value)} />
          </div>
          <div>
            <label>Phone Number</label>
            <input value={values.phoneNumber || ''} onChange={e => updateCmsField(section, 'phoneNumber', e.target.value)} />
          </div>
        </div>
        <div className="two-column">
          <div>
            <label>WhatsApp Number</label>
            <input value={values.whatsappNumber || ''} onChange={e => updateCmsField(section, 'whatsappNumber', e.target.value)} />
          </div>
          <div>
            <label>Emergency Contact</label>
            <input value={values.emergencyContact || ''} onChange={e => updateCmsField(section, 'emergencyContact', e.target.value)} />
          </div>
        </div>
        <div className="two-column">
          <div>
            <label>Google Map Link</label>
            <input value={values.googleMapLink || ''} onChange={e => updateCmsField(section, 'googleMapLink', e.target.value)} />
          </div>
          <div>
            <label>Working Hours</label>
            <input value={values.workingHours || ''} onChange={e => updateCmsField(section, 'workingHours', e.target.value)} />
          </div>
        </div>
        <div>
          <label>Address</label>
          <textarea value={values.address || ''} onChange={e => updateCmsField(section, 'address', e.target.value)} />
        </div>
        <div>
          <label>Social Media</label>
          <textarea value={values.socialMedia || ''} onChange={e => updateCmsField(section, 'socialMedia', e.target.value)} />
        </div>
        <div>
          <label>FAQ Content</label>
          <textarea value={values.faq || ''} onChange={e => updateCmsField(section, 'faq', e.target.value)} placeholder="Use blank lines between question: answer blocks" />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      {/* Sidebar Panel */}
      <aside className="admin-sidebar">
        <h2 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', padding: '0 14px', marginBottom: '16px' }}>
          Admin Console
        </h2>
        <button type="button" onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'active' : ''}>
          <DashboardIcon /> Dashboard
        </button>
        <button type="button" onClick={() => setActiveTab('users')} className={activeTab === 'users' ? 'active' : ''}>
          <UsersIcon /> Users Manager
        </button>
        <button type="button" onClick={() => setActiveTab('foods')} className={activeTab === 'foods' ? 'active' : ''}>
          <FoodIcon /> Food Posts
        </button>
        <button type="button" onClick={() => setActiveTab('claims')} className={activeTab === 'claims' ? 'active' : ''}>
          <ClaimIcon /> Claims Feed
        </button>
        <button type="button" onClick={() => setActiveTab('reviews')} className={activeTab === 'reviews' ? 'active' : ''}>
          <ReviewIcon /> Reviews Mod
        </button>
        <button type="button" onClick={() => setActiveTab('reports')} className={activeTab === 'reports' ? 'active' : ''}>
          <ReportIcon /> Reports & Logs
        </button>
        <button type="button" onClick={() => setActiveTab('cms')} className={activeTab === 'cms' ? 'active' : ''}>
          <CmsIcon /> CMS Settings
        </button>
        <button onClick={logout} style={{ border: 'none', background: 'none', justifyContent: 'flex-start', padding: '12px 14px', width: '100%', color: '#64748b', cursor: 'pointer' }}>
          <LogoutIcon /> Logout
        </button>
      </aside>

      {/* Main dashboard content */}
      <main className="admin-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>Admin Dashboard</h1>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>System health and platform metrics overview.</p>
          </div>
          <div style={{ background: '#f0fdf4', color: '#16a34a', fontWeight: '800', padding: '8px 16px', borderRadius: '50px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }}></span>
            All Systems Operational
          </div>
        </div>

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

        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && data && (
          <div>
            {/* Metric overview cards */}
            <div className="metric-row">
              <div className="metric">
                <strong>{data.cards.totalRestaurants || 0}</strong>
                <span>Restaurants</span>
              </div>
              <div className="metric metric-secondary">
                <strong>{data.cards.totalNgos || 0}</strong>
                <span>NGO Partners</span>
              </div>
              <div className="metric">
                <strong>{data.cards.totalFoodPosts || 0}</strong>
                <span>Food Posts</span>
              </div>
              <div className="metric metric-secondary">
                <strong>{data.cards.foodSavedKg || 0} kg</strong>
                <span>Food Saved</span>
              </div>
              <div className="metric">
                <strong>{data.cards.mealsServed || 0}</strong>
                <span>Meals Served</span>
              </div>
            </div>

            {/* Visual SVG line & doughnut charts */}
            <div className="two-column">
              <div className="panel">
                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Posted Food Volume (Past 7 Days)</h2>
                <LineChart data={data.weeklyPostedKg || [0, 0, 0, 0, 0, 0, 0]} labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} />
              </div>

              <div className="panel">
                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Food Categories</h2>
                <DoughnutChart 
                  data={[
                    data.cards.collectedFood || 0,
                    data.cards.activeClaims || 0,
                    data.cards.availableFood || 0,
                    data.cards.expiredFood || 0,
                    data.cards.cancelledFood || 0
                  ]} 
                  labels={['Collected', 'Claimed', 'Available', 'Expired', 'Cancelled']}
                />
              </div>
            </div>

            {/* Pending user approvals table */}
            <div className="panel" style={{ marginTop: '28px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Pending Registration Approvals</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {users.filter(u => u.account_status === 'pending').map(user => (
                  <div key={user.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontWeight: '700', fontSize: '14px' }}>{user.name}</h3>
                      <p style={{ color: '#64748b', fontSize: '12px' }}>Email: {user.email} | Role: <strong>{user.role}</strong></p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => verifyUser(user.id, 'approve')} className="primary" style={{ padding: '4px 10px', fontSize: '12px' }}>Approve</button>
                      <button onClick={() => verifyUser(user.id, 'reject')} className="danger" style={{ padding: '4px 10px', fontSize: '12px' }}>Reject</button>
                    </div>
                  </div>
                ))}
                {users.filter(u => u.account_status === 'pending').length === 0 && (
                  <p style={{ color: '#64748b' }}>No pending user approvals.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Users Manager */}
        {activeTab === 'users' && (
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Platform User Directory</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="Search users by name, email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ padding: '8px 12px', width: '250px' }} />
                <button onClick={() => exportCsv('users')} className="primary">Export Report</button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '12px' }}>Name</th>
                    <th style={{ padding: '12px' }}>Email</th>
                    <th style={{ padding: '12px' }}>Role</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>City</th>
                    <th style={{ padding: '12px' }}>Created</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '700' }}>{u.name}</td>
                      <td style={{ padding: '12px' }}>{u.email}</td>
                      <td style={{ padding: '12px', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700' }}>{u.role}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge badge-${u.account_status}`}>{u.account_status}</span>
                      </td>
                      <td style={{ padding: '12px' }}>{u.city || '—'}</td>
                      <td style={{ padding: '12px' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {u.account_status === 'pending' && <button onClick={() => verifyUser(u.id, 'approve')} style={{ padding: '4px 8px', fontSize: '11px' }}>Approve</button>}
                          {u.account_status === 'active' && <button onClick={() => verifyUser(u.id, 'suspend')} style={{ padding: '4px 8px', fontSize: '11px' }} className="danger">Suspend</button>}
                          {u.account_status === 'suspended' && <button onClick={() => verifyUser(u.id, 'approve')} style={{ padding: '4px 8px', fontSize: '11px' }}>Activate</button>}
                          <button onClick={() => deleteUser(u.id)} className="danger" style={{ padding: '4px 8px', fontSize: '11px' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Food Posts */}
        {activeTab === 'foods' && (
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Surplus Food Listings</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={clearExpiredFoods} className="danger">Remove Expired Posts</button>
                <button onClick={() => exportCsv('foods')} className="primary">Export Report</button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '12px' }}>Food Post</th>
                    <th style={{ padding: '12px' }}>Restaurant Donor</th>
                    <th style={{ padding: '12px' }}>Quantity</th>
                    <th style={{ padding: '12px' }}>Expiry</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Unsafe</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {foods.map(food => (
                    <tr key={food.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '700' }}>{food.name}</td>
                      <td style={{ padding: '12px' }}>{food.restaurant_name}</td>
                      <td style={{ padding: '12px' }}>{food.quantity_kg} kg</td>
                      <td style={{ padding: '12px' }}>{new Date(food.expiry_time).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge badge-${food.status}`}>{food.status}</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {food.is_unsafe ? <span style={{ color: '#ef4444', fontWeight: '700' }}>YES</span> : 'No'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {!food.is_unsafe && food.status !== 'cancelled' && (
                            <button onClick={() => markFoodUnsafe(food.id)} className="danger" style={{ padding: '4px 8px', fontSize: '11px' }}>Mark Unsafe</button>
                          )}
                          <button onClick={() => deleteFood(food.id)} className="danger" style={{ padding: '4px 8px', fontSize: '11px' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Claims Feed */}
        {activeTab === 'claims' && (
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>NGO claim Transaction Log</h2>
              <button onClick={() => exportCsv('claims')} className="primary">Export Report</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '12px' }}>Claim ID</th>
                    <th style={{ padding: '12px' }}>Food Details</th>
                    <th style={{ padding: '12px' }}>Restaurant Donor</th>
                    <th style={{ padding: '12px' }}>Claimant NGO</th>
                    <th style={{ padding: '12px' }}>Claim Date</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '700' }}>#{c.id}</td>
                      <td style={{ padding: '12px' }}>{c.food_name || `Food #${c.food_id}`}</td>
                      <td style={{ padding: '12px' }}>{c.restaurant_name || '—'}</td>
                      <td style={{ padding: '12px' }}>{c.ngo_name || '—'}</td>
                      <td style={{ padding: '12px' }}>{new Date(c.claimed_at).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge badge-${c.status}`}>{c.status}</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {c.status === 'claimed' && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => updateClaim(c.id, 'collected')} className="primary" style={{ padding: '4px 8px', fontSize: '11px' }}>Force Complete</button>
                            <button onClick={() => updateClaim(c.id, 'cancelled')} className="danger" style={{ padding: '4px 8px', fontSize: '11px' }}>Cancel Claim</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Reviews Moderation */}
        {activeTab === 'reviews' && (
          <div className="panel">
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Platform Reviews Moderator</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reviews.map(rev => (
                <div key={rev.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong>{rev.from_user_name} ({rev.from_user_role})</strong>
                      <span style={{ color: '#64748b' }}>&rarr; reviewed &rarr;</span>
                      <strong>{rev.to_user_name} ({rev.to_user_role})</strong>
                      <span style={{ color: '#f97316', fontWeight: '800', marginLeft: '10px' }}>{rev.rating} ★</span>
                    </div>
                    <p style={{ fontStyle: 'italic', marginTop: '8px', color: '#475569' }}>"{rev.comment}"</p>
                  </div>
                  <button onClick={() => deleteReview(rev.id)} className="danger" style={{ padding: '4px 10px', fontSize: '12px' }}>
                    Delete Offensive Review
                  </button>
                </div>
              ))}
              {reviews.length === 0 && <p style={{ color: '#64748b' }}>No reviews posted on the platform yet.</p>}
            </div>
          </div>
        )}

        {/* Tab 6: Reports & Logs */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Audit Logs list */}
            <div className="panel">
              <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>System Security Logs (Audit Logs)</h2>
              <div className="audit-log-list">
                {reports.auditLogs.map(log => (
                  <div key={log.id} className="audit-log-row">
                    <div className="audit-log-copy">
                      <span className="audit-log-action">[{log.action}]</span>
                      <span>Entity: {log.entity_type} (ID: {log.entity_id || 'N/A'}) {log.details && `| ${log.details}`}</span>
                    </div>
                    <span className="audit-log-time">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform reports list */}
            <div className="panel">
              <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>User Flagged Reports</h2>
              <div className="report-card-list">
                {reports.openReports.map(rep => (
                  <div key={rep.id} className="card report-card-row">
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Reason: {rep.reason}</h3>
                      <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                        Reporter: <strong>{rep.reporter_name}</strong> | Target: <strong>{rep.target_user_name || 'N/A'}</strong> | Food Item: {rep.food_name || 'N/A'}
                      </p>
                    </div>
                    <span className={`badge badge-${rep.status || 'pending'}`}>{rep.status}</span>
                  </div>
                ))}
                {reports.openReports.length === 0 && (
                  <p style={{ color: '#64748b' }}>No active user reports.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: CMS Settings */}
        {activeTab === 'cms' && (
          <div className="panel">
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Website Content Management</h2>
            <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '13px' }}>
              These forms control the public website pages, homepage media, contact details, and informational sections.
            </p>

            <div className="inline-actions" style={{ marginBottom: '24px', gap: '10px', flexWrap: 'wrap' }}>
              {cmsSections.map(section => (
                <button
                  key={section.key}
                  type="button"
                  className={activeCmsSection === section.key ? 'primary' : ''}
                  onClick={() => setActiveCmsSection(section.key)}
                >
                  {section.label}
                </button>
              ))}
            </div>

            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '18px' }}>
                {cmsSections.find(section => section.key === activeCmsSection)?.label}
              </h3>
              {renderCmsEditor()}
              <div style={{ display: 'flex', gap: '12px', marginTop: '22px' }}>
                <button type="button" className="primary" onClick={() => saveCmsSection(activeCmsSection)}>
                  Save Changes
                </button>
                <button type="button" onClick={loadCmsSettings}>
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
