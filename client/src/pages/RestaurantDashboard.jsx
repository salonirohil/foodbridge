import React, { useEffect, useState } from 'react';
import { http } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { 
  DashboardIcon, FoodIcon, PlusIcon, ClaimIcon, ReviewIcon, 
  NotificationIcon, SettingsIcon, ProfileIcon, LogoutIcon, 
  VerifiedBadgeIcon, MapIcon, GpsIcon 
} from '../components/Icons';
import { DoughnutChart } from '../components/Charts';

export function RestaurantDashboard() {
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState(() => window.location.hash.replace('#', '') || 'dashboard');
  const [dashboard, setDashboard] = useState({ summary: {}, foods: [] });
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Food form state
  const [form, setForm] = useState({
    name: '', quantityKg: '', expiryTime: '', pickupTime: '', address: '', description: '',
    vegNonVeg: 'veg', category: 'Cooked Meals', specialInstructions: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [editingId, setEditingId] = useState(null);

  // History states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vegFilter, setVegFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Profile update states
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    description: '',
    profileImageUrl: ''
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });

  // Reviews input state (for rating NGO on a claim)
  const [reviewInput, setReviewInput] = useState({ claimId: '', rating: 5, comment: '' });
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    function syncHashTab() {
      const nextTab = window.location.hash.replace('#', '') || 'dashboard';
      setActiveTab(nextTab);
    }

    window.addEventListener('hashchange', syncHashTab);
    syncHashTab();
    return () => window.removeEventListener('hashchange', syncHashTab);
  }, []);

  useEffect(() => {
    const nextHash = `#${activeTab}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', `${window.location.pathname}${nextHash}`);
    }
    setMessage('');
    setError('');
  }, [activeTab]);

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

  // Fetch all dashboard data
  async function loadDashboard() {
    try {
      const { data } = await http.get('/foods/restaurant/dashboard');
      setDashboard(data);
    } catch (err) {}
  }

  async function loadReviews() {
    try {
      const { data } = await http.get('/reviews/received');
      setReviews(data);
    } catch (err) {}
  }

  async function loadNotifications() {
    try {
      const { data } = await http.get('/notifications');
      setNotifications(data);
    } catch (err) {}
  }

  // Settings state
  const [settingsForm, setSettingsForm] = useState({
    maximumNGOPickupDistance: user?.maximumNGOPickupDistance ?? 25,
    foodPostingPolicy: user?.foodPostingPolicy || 'strict',
    ngoClaimApproval: user?.ngoClaimApproval || 'restaurant_approval',
    claimPickupNotifications: user?.claimPickupNotifications !== false
  });

  // Food safety checklist state (for Strict Safety Checklist policy)
  const [safetyChecklist, setSafetyChecklist] = useState({
    tempControl: false,
    freshness: false,
    cleanContainer: false
  });

  useEffect(() => {
    loadDashboard();
    loadReviews();
    loadNotifications();
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        pinCode: user.pinCode || user.pin_code || '',
        description: user.description || '',
        profileImageUrl: user.profileImageUrl || user.profile_image_url || ''
      });
      setSettingsForm({
        maximumNGOPickupDistance: user.maximumNGOPickupDistance ?? 25,
        foodPostingPolicy: user.foodPostingPolicy || 'strict',
        ngoClaimApproval: user.ngoClaimApproval || 'restaurant_approval',
        claimPickupNotifications: user.claimPickupNotifications !== false
      });
    }
  }, [user]);

  async function saveSettings(e) {
    e.preventDefault();
    setMessage('');
    setError('');

    const dist = Number(settingsForm.maximumNGOPickupDistance);
    if (isNaN(dist) || dist <= 0) {
      setError('Maximum NGO pickup distance must be a valid positive number greater than 0');
      return;
    }

    try {
      const { data } = await http.patch('/auth/restaurant-settings', settingsForm);
      setMessage(data.message || 'Settings saved successfully.');
      updateUser(data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save settings');
    }
  }

  async function approveClaimRequest(claimId) {
    try {
      const { data } = await http.patch(`/claims/${claimId}/approve`);
      setMessage(data.message || 'Claim approved successfully');
      loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not approve claim');
    }
  }

  async function rejectClaimRequest(claimId) {
    try {
      const { data } = await http.patch(`/claims/${claimId}/reject`);
      setMessage(data.message || 'Claim rejected');
      loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reject claim');
    }
  }

  // Submit Food
  async function submitFood(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if ((user?.foodPostingPolicy || settingsForm.foodPostingPolicy) === 'strict') {
      if (!safetyChecklist.tempControl || !safetyChecklist.freshness || !safetyChecklist.cleanContainer) {
        setError('Strict Safety Checklist is mandatory under your restaurant settings. Please complete all safety items before publishing.');
        return;
      }
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (imageFile) formData.append('image', imageFile);

    try {
      if (editingId) {
        await http.put(`/foods/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessage('Food post updated successfully');
      } else {
        await http.post('/foods', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMessage('Food post created successfully');
      }
      resetFoodForm();
      loadDashboard();
      setActiveTab('dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save food post');
    }
  }

  function resetFoodForm() {
    setForm({
      name: '', quantityKg: '', expiryTime: '', pickupTime: '', address: '', description: '',
      vegNonVeg: 'veg', category: 'Cooked Meals', specialInstructions: ''
    });
    setSafetyChecklist({ tempControl: false, freshness: false, cleanContainer: false });
    setImageFile(null);
    setPreview('');
    setEditingId(null);
  }

  function startEditFood(food) {
    setEditingId(food.id);
    const toInputDateTime = (val) => val ? new Date(new Date(val).getTime() - new Date(val).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
    setForm({
      name: food.name,
      quantityKg: food.quantity_kg,
      expiryTime: toInputDateTime(food.expiry_time),
      pickupTime: toInputDateTime(food.pickup_time),
      address: food.address,
      description: food.description || '',
      vegNonVeg: food.veg_non_veg || 'veg',
      category: food.category || 'Cooked Meals',
      specialInstructions: food.special_instructions || ''
    });
    setPreview(food.image_url || '');
    setActiveTab('add-food');
  }

  async function deleteFood(id) {
    if (!window.confirm('Delete this food post from history?')) return;
    try {
      await http.delete(`/foods/${id}`);
      setMessage('Food post deleted successfully');
      loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete food post');
    }
  }

  async function updateStatus(id, newStatus) {
    try {
      await http.patch(`/foods/${id}/status`, { status: newStatus });
      setMessage('Food status updated');
      loadDashboard();
    } catch (err) {
      setError('Could not update status');
    }
  }

  // Get current GPS coordinates
  function captureLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm(f => ({ ...f, address: `https://www.google.com/maps?q=${latitude},${longitude}` }));
        setMessage('GPS Location captured!');
      },
      () => setError('Could not fetch GPS location')
    );
  }

  // Handle rating NGO
  async function submitNgoReview(e) {
    e.preventDefault();
    try {
      await http.post('/reviews', reviewInput);
      setMessage('NGO Review submitted successfully');
      setShowReviewModal(false);
      loadReviews();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit review');
    }
  }

  // Notification management
  async function markNotificationRead(id) {
    await http.patch(`/notifications/${id}/read`);
    loadNotifications();
  }

  async function deleteNotification(id) {
    await http.delete(`/notifications/${id}`);
    loadNotifications();
  }

  // Profile update
  async function updateProfile(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const { data } = await http.patch('/auth/profile', profileForm);
      setMessage(data.message);
      updateUser(data.user);
    } catch (err) {
      setError('Could not update profile');
    }
  }

  async function uploadProfileImage(file) {
    if (!file) return;

    const formData = new FormData();
    formData.append('media', file);

    try {
      const { data } = await http.post('/auth/profile/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfileForm(current => ({ ...current, profileImageUrl: data.url }));
      setMessage('Profile image uploaded. Save profile to publish it.');
    } catch (err) {
      setError('Could not upload profile image');
    }
  }

  // Password change
  async function changePassword(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const { data } = await http.patch('/auth/change-password', passwordForm);
      setMessage(data.message);
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change password');
    }
  }

  // CSV Report Downloader
  function downloadCsvReport() {
    const headers = ['ID', 'Name', 'Category', 'Veg/Non-Veg', 'Quantity (kg)', 'Expiry', 'Pickup', 'Status', 'Date Posted'];
    const rows = dashboard.foods.map(f => [
      f.id, f.name, f.category, f.veg_non_veg, f.quantity_kg, f.expiry_time, f.pickup_time, f.status, f.created_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `foodbridge_donation_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Dashboard calculation for chart
  const statusCounts = dashboard.foods.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, { available: 0, claimed: 0, collected: 0, expired: 0, cancelled: 0 });

  const chartData = [
    statusCounts.collected,
    statusCounts.claimed,
    statusCounts.available,
    statusCounts.expired,
    statusCounts.cancelled
  ];
  const chartLabels = ['Collected', 'Claimed', 'Available', 'Expired', 'Cancelled'];
  const chartColors = ['#3b82f6', '#f97316', '#22c55e', '#ef4444', '#64748b'];

  // History filtering & search
  const filteredFoods = dashboard.foods.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.address.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    const matchesVeg = vegFilter === 'all' || f.veg_non_veg === vegFilter;
    return matchesSearch && matchesStatus && matchesVeg;
  });

  // Sorting
  const sortedFoods = [...filteredFoods].sort((a, b) => {
    if (sortBy === 'quantity') return b.quantity_kg - a.quantity_kg;
    if (sortBy === 'expiry') return new Date(a.expiry_time) - new Date(b.expiry_time);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Pagination
  const totalPages = Math.ceil(sortedFoods.length / itemsPerPage);
  const paginatedFoods = sortedFoods.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="admin-shell">
      {/* Sidebar navigation */}
      <aside className="admin-sidebar">
        <h2 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', padding: '0 14px', marginBottom: '16px' }}>
          Restaurant Panel
        </h2>
        <a href="#dashboard" onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'active' : ''}>
          <DashboardIcon /> Dashboard
        </a>
        <a href="#add-food" onClick={() => { setActiveTab('add-food'); resetFoodForm(); }} className={activeTab === 'add-food' ? 'active' : ''}>
          <PlusIcon /> Add Food
        </a>
        <a href="#history" onClick={() => setActiveTab('history')} className={activeTab === 'history' ? 'active' : ''}>
          <FoodIcon /> Food History
        </a>
        <a href="#claims" onClick={() => setActiveTab('claims')} className={activeTab === 'claims' ? 'active' : ''}>
          <ClaimIcon /> Claims
        </a>
        <a href="#reviews" onClick={() => setActiveTab('reviews')} className={activeTab === 'reviews' ? 'active' : ''}>
          <ReviewIcon /> Reviews
        </a>
        <a href="#notifications" onClick={() => setActiveTab('notifications')} className={activeTab === 'notifications' ? 'active' : ''}>
          <NotificationIcon /> Notifications {notifications.filter(n => !n.is_read).length > 0 && <span style={{ background: '#f97316', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '50px' }}>{notifications.filter(n => !n.is_read).length}</span>}
        </a>
        <a href="#profile" onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'active' : ''}>
          <ProfileIcon /> Profile
        </a>
        <a href="#settings" onClick={() => setActiveTab('settings')} className={activeTab === 'settings' ? 'active' : ''}>
          <SettingsIcon /> Settings
        </a>
        <button onClick={logout} style={{ border: 'none', background: 'none', justifyContent: 'flex-start', padding: '12px 14px', width: '100%', color: '#64748b', cursor: 'pointer' }}>
          <LogoutIcon /> Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="admin-content">
        {/* Verification message / Verified badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>{user?.name}</h1>
              {user?.isVerified && (
                <span className="badge badge-available" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px' }}>
                  <VerifiedBadgeIcon /> Verified Donor
                </span>
              )}
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>Welcome back. Manage your surplus food waste exchanges here.</p>
          </div>
          {activeTab === 'dashboard' && (
            <button className="primary" onClick={() => { setActiveTab('add-food'); resetFoodForm(); }}>
              <PlusIcon /> Add New Food
            </button>
          )}
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
        {activeTab === 'dashboard' && (
          <div>
            {/* Metric row */}
            <div className="metric-row">
              <div className="metric">
                <strong>{dashboard.summary.totalPosts || 0}</strong>
                <span>Total Posts</span>
              </div>
              <div className="metric metric-secondary">
                <strong>{dashboard.summary.totalFoodKg || 0} kg</strong>
                <span>Food Donated</span>
              </div>
              <div className="metric">
                <strong>{dashboard.summary.completedPickups || 0}</strong>
                <span>Meals Served</span>
              </div>
              <div className="metric metric-secondary">
                <strong>{dashboard.summary.avgRating || '5.0'} ★</strong>
                <span>NGO Rating</span>
              </div>
            </div>

            {/* Main grid: recent posts + claims overview doughnut */}
            <div className="two-column">
              {/* Recent Food posts */}
              <div className="panel">
                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Recent Food Posts</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {dashboard.foods.slice(0, 3).map(food => (
                    <div key={food.id} style={{ display: 'flex', gap: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                      <img 
                        src={food.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120'} 
                        alt={food.name} 
                        style={{ width: '80px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} 
                        onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=120'; }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: '700' }}>{food.name}</h3>
                          <span className={`badge badge-${food.status}`}>{food.status}</span>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                          Quantity: {food.quantity_kg} kg | Expiry: {new Date(food.expiry_time).toLocaleDateString()}
                        </p>
                        {food.ngo_name && (
                          <p style={{ color: '#22c55e', fontSize: '12px', fontWeight: '700', marginTop: '4px' }}>
                            Claimed by: {food.ngo_name} ({food.ngo_phone})
                          </p>
                        )}
                        {food.status === 'available' && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button onClick={() => startEditFood(food)} style={{ padding: '4px 10px', fontSize: '11px' }}>Edit</button>
                            <button onClick={() => deleteFood(food.id)} className="danger" style={{ padding: '4px 10px', fontSize: '11px' }}>Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {dashboard.foods.length === 0 && <p style={{ color: '#64748b' }}>No food posts created yet.</p>}
                </div>
              </div>

              {/* Claims chart */}
              <div className="panel">
                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Claims Overview</h2>
                <DoughnutChart data={chartData} labels={chartLabels} colors={chartColors} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Add Food Form */}
        {activeTab === 'add-food' && (
          <form className="panel wide-panel" onSubmit={submitFood}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>
              {editingId ? 'Edit Food Listing' : 'Add Food Listing'}
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid">
              <label>Food Name *
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rice & Chicken Curry" />
              </label>
              
              <label>Category *
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="Cooked Meals">Cooked Meals</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Fruits">Fruits</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Others">Others</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid">
              <label>Dietary Type
                <select value={form.vegNonVeg} onChange={e => setForm({ ...form, vegNonVeg: e.target.value })}>
                  <option value="veg">Vegetarian</option>
                  <option value="non-veg">Non-Vegetarian</option>
                </select>
              </label>
              
              <label>Quantity (kg) *
                <input type="number" step="0.1" required value={form.quantityKg} onChange={e => setForm({ ...form, quantityKg: e.target.value })} placeholder="e.g. 12.5" />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid">
              <label>Expiry Time *
                <input type="datetime-local" required value={form.expiryTime} onChange={e => setForm({ ...form, expiryTime: e.target.value })} />
              </label>
              
              <label>Pickup Deadline *
                <input type="datetime-local" required value={form.pickupTime} onChange={e => setForm({ ...form, pickupTime: e.target.value })} />
              </label>
            </div>

            <label>Pickup Location Address *
              <textarea required value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Enter physical address or map location coordinates" />
            </label>
            
            <div className="inline-actions">
              <button type="button" onClick={captureLocation} className="button secondary">
                <GpsIcon /> Capture Current GPS
              </button>
            </div>

            <label>Special Instructions
              <textarea value={form.specialInstructions} onChange={e => setForm({ ...form, specialInstructions: e.target.value })} placeholder="e.g. Bring own storage containers, ask for manager at back entrance." />
            </label>

            <label>Description / Description of items
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details about storage, spices, or safety parameters" />
            </label>

            <label>Food Photo
              <input type="file" accept="image/*" onChange={e => {
                const file = e.target.files[0];
                setImageFile(file);
                if (file) setPreview(URL.createObjectURL(file));
              }} />
            </label>
            {preview && <img src={preview} alt="Food preview" className="image-preview" style={{ maxHeight: '200px', width: 'auto', marginBottom: '20px' }} />}

            {(user?.foodPostingPolicy || settingsForm.foodPostingPolicy) === 'strict' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '4px', color: '#16a34a' }}>
                  Strict Safety Checklist (Mandatory Policy Active)
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                  Your restaurant settings enforce strict safety verification before publishing surplus food.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={safetyChecklist.tempControl} onChange={e => setSafetyChecklist({ ...safetyChecklist, tempControl: e.target.checked })} />
                    Food stored at safe temperature & handled under sanitary conditions *
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={safetyChecklist.freshness} onChange={e => setSafetyChecklist({ ...safetyChecklist, freshness: e.target.checked })} />
                    Food is freshly prepared, untampered, and clear of spoilage *
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={safetyChecklist.cleanContainer} onChange={e => setSafetyChecklist({ ...safetyChecklist, cleanContainer: e.target.checked })} />
                    Packaged in food-grade, clean, sealed transport containers *
                  </label>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px' }}>
              <button type="submit" className="primary">{editingId ? 'Update Food' : 'Publish Food'}</button>
              <button type="button" onClick={() => { setActiveTab('dashboard'); resetFoodForm(); }}>Cancel</button>
            </div>
          </form>
        )}

        {/* Tab 3: Food History */}
        {activeTab === 'history' && (
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Donation History</h2>
              <button onClick={downloadCsvReport} className="primary">
                Download CSV Report
              </button>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }} className="grid">
              <input type="text" placeholder="Search by name, address..." value={search} onChange={e => setSearch(e.target.value)} />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="claimed">Claimed</option>
                <option value="collected">Collected</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select value={vegFilter} onChange={e => setVegFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="veg">Vegetarian</option>
                <option value="non-veg">Non-Veg</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="created_at">Sort by Date</option>
                <option value="quantity">Sort by Quantity</option>
                <option value="expiry">Sort by Expiry</option>
              </select>
            </div>

            {/* History Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                    <th style={{ padding: '12px' }}>Food Post</th>
                    <th style={{ padding: '12px' }}>Category</th>
                    <th style={{ padding: '12px' }}>Diet</th>
                    <th style={{ padding: '12px' }}>Quantity</th>
                    <th style={{ padding: '12px' }}>Expiry Time</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Claimant NGO</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFoods.map(food => (
                    <tr key={food.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '700' }}>{food.name}</td>
                      <td style={{ padding: '12px' }}>{food.category}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: food.veg_non_veg === 'veg' ? '#22c55e' : '#ef4444' }}>
                          {food.veg_non_veg}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{food.quantity_kg} kg</td>
                      <td style={{ padding: '12px' }}>{new Date(food.expiry_time).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge badge-${food.status}`}>{food.status}</span>
                      </td>
                      <td style={{ padding: '12px', color: '#22c55e', fontWeight: '700' }}>
                        {food.ngo_name || '—'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {food.status === 'available' && (
                            <button onClick={() => startEditFood(food)} style={{ padding: '4px 8px', fontSize: '11px' }}>Edit</button>
                          )}
                          {food.status === 'claimed' && (
                            <>
                              <button onClick={() => updateStatus(food.id, 'collected')} className="primary" style={{ padding: '4px 8px', fontSize: '11px' }}>Collected</button>
                              <button onClick={() => updateStatus(food.id, 'cancelled')} className="danger" style={{ padding: '4px 8px', fontSize: '11px' }}>Cancel</button>
                            </>
                          )}
                          <button onClick={() => deleteFood(food.id)} className="danger" style={{ padding: '4px 8px', fontSize: '11px' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedFoods.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No donations match filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>&larr; Prev</button>
                <span style={{ alignSelf: 'center', fontWeight: '700' }}>Page {currentPage} of {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next &rarr;</button>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Claims */}
        {activeTab === 'claims' && (
          <div className="panel">
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Food Claims & Approval Requests</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {dashboard.foods.filter(f => f.status === 'claimed' || f.status === 'collected' || f.status === 'pending_approval' || f.claim_status === 'pending').map(food => (
                <div key={food.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontWeight: '700', fontSize: '16px' }}>{food.name}</h3>
                    <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
                      NGO Claimant: <strong>{food.ngo_name || 'NGO Request'}</strong> {food.ngo_phone ? `(${food.ngo_phone})` : ''}
                    </p>
                    <p style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                      Date: {food.claimed_at ? new Date(food.claimed_at).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {(food.claim_status === 'pending' || food.status === 'pending_approval') ? (
                      <>
                        <span className="badge badge-pending">Pending Approval</span>
                        <button onClick={() => approveClaimRequest(food.claim_id)} className="primary">Approve Claim</button>
                        <button onClick={() => rejectClaimRequest(food.claim_id)} className="danger">Reject Claim</button>
                      </>
                    ) : (
                      <>
                        <span className={`badge badge-${food.status}`}>{food.status}</span>
                        {food.status === 'claimed' && (
                          <>
                            <button onClick={() => updateStatus(food.id, 'collected')} className="primary">Mark Collected</button>
                            <button onClick={() => updateStatus(food.id, 'cancelled')} className="danger">Cancel</button>
                          </>
                        )}
                        {food.status === 'collected' && (
                          <button onClick={() => {
                            setReviewInput({ claimId: food.claim_id, rating: 5, comment: '' });
                            setShowReviewModal(true);
                          }} className="button secondary">
                            Rate NGO
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {dashboard.foods.filter(f => f.status === 'claimed' || f.status === 'collected' || f.status === 'pending_approval' || f.claim_status === 'pending').length === 0 && (
                <p style={{ color: '#64748b' }}>No active claims or pending approval requests found.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Reviews */}
        {activeTab === 'reviews' && (
          <div className="panel">
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Reviews from NGOs</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reviews.map(review => (
                <div key={review.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '800' }}>{review.reviewer_name}</h3>
                    <span style={{ color: '#f97316', fontWeight: '800' }}>{review.rating} ★</span>
                  </div>
                  <p style={{ fontStyle: 'italic', color: '#475569' }}>"{review.comment || 'No comment provided.'}"</p>
                  <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '8px' }}>{new Date(review.created_at).toLocaleDateString()}</p>
                </div>
              ))}
              {reviews.length === 0 && <p style={{ color: '#64748b' }}>No reviews received yet.</p>}
            </div>
          </div>
        )}

        {/* Tab 6: Notifications */}
        {activeTab === 'notifications' && (
          <div className="panel">
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Your Notifications</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map(notif => (
                <div key={notif.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: notif.is_read ? '#ffffff' : '#f0fdf4' }}>
                  <div>
                    <p style={{ fontWeight: notif.is_read ? '500' : '700', color: '#0f172a' }}>{notif.message}</p>
                    <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>{new Date(notif.created_at).toLocaleString()}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!notif.is_read && <button onClick={() => markNotificationRead(notif.id)} style={{ padding: '4px 8px', fontSize: '11px' }}>Read</button>}
                    <button onClick={() => deleteNotification(notif.id)} className="danger" style={{ padding: '4px 8px', fontSize: '11px' }}>Delete</button>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && <p style={{ color: '#64748b' }}>No notifications.</p>}
            </div>
          </div>
        )}

        {/* Tab 7: Profile */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <form className="panel wide-panel" onSubmit={updateProfile}>
              <div className="profile-header">
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Organization Details</h2>
                  <p className="profile-subtitle">Present your restaurant or donor identity clearly to NGOs before they claim a pickup.</p>
                </div>
                <div className="profile-avatar-card">
                  {profileForm.profileImageUrl ? (
                    <img className="profile-avatar-preview" src={profileForm.profileImageUrl} alt={profileForm.name || 'Restaurant profile'} />
                  ) : (
                    <div className="profile-avatar-placeholder">{(profileForm.name || 'RB').slice(0, 2).toUpperCase()}</div>
                  )}
                  <input type="file" accept="image/*" onChange={e => uploadProfileImage(e.target.files?.[0])} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid">
                <label>Restaurant Name
                  <input required value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
                </label>
                <label>Phone Number
                  <input value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '16px' }} className="grid">
                <label>City
                  <input value={profileForm.city} onChange={e => setProfileForm({ ...profileForm, city: e.target.value })} />
                </label>
                <label>State
                  <input value={profileForm.state} onChange={e => setProfileForm({ ...profileForm, state: e.target.value })} />
                </label>
                <label>Pin Code
                  <input value={profileForm.pinCode} onChange={e => setProfileForm({ ...profileForm, pinCode: e.target.value })} />
                </label>
              </div>

              <label>Address
                <textarea value={profileForm.address} onChange={e => setProfileForm({ ...profileForm, address: e.target.value })} />
              </label>

              {profileForm.address && (
                <div className="inline-actions" style={{ marginBottom: '18px' }}>
                  <a
                    className="button"
                    href={profileForm.address.startsWith('http') ? profileForm.address : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profileForm.address)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapIcon /> Open map location
                  </a>
                </div>
              )}

              <label>Profile Image URL
                <input value={profileForm.profileImageUrl} onChange={e => setProfileForm({ ...profileForm, profileImageUrl: e.target.value })} placeholder="e.g. https://images.unsplash.com/..." />
              </label>
              
              <label>Description / Instructions
                <textarea value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} placeholder="Describe your restaurant or store pickup locations..." />
              </label>

              <button type="submit" className="primary">Save Profile</button>
            </form>

            <form className="panel wide-panel" onSubmit={changePassword}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Change Password</h2>
              <label>Current Password
                <input type="password" required value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
              </label>
              <label>New Password
                <input type="password" required value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
              </label>
              <button type="submit" className="primary">Update Password</button>
            </form>
          </div>
        )}

        {/* Tab 8: Settings */}
        {activeTab === 'settings' && (
          <div className="panel wide-panel settings-shell">
            <div className="settings-header">
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Restaurant Settings</h2>
                <p className="profile-subtitle">Configure your FoodBridge donation workflow — pickup distance, posting policy, claim approvals, and notifications.</p>
              </div>
              <div className="settings-status-card">
                <strong>{user?.isVerified ? '✓ Verified Donor' : 'Pending Verification'}</strong>
                <span>{user?.email}</span>
              </div>
            </div>

            <form onSubmit={saveSettings}>
              <div className="settings-grid">
                {/* Left Column: Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {/* Card 1: Posting Preferences */}
                  <div className="settings-card">
                    <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '4px' }}>Posting Preferences</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>These settings control how food donations are published on FoodBridge.</p>

                    <label style={{ display: 'block', marginBottom: '16px' }}>
                      <span style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '4px' }}>Maximum NGO Pickup Distance</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={settingsForm.maximumNGOPickupDistance}
                          onChange={e => setSettingsForm({ ...settingsForm, maximumNGOPickupDistance: Number(e.target.value) })}
                          style={{ width: '90px', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '14px', fontWeight: '700' }}
                        />
                        <span style={{ fontWeight: '700', color: '#64748b' }}>km</span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                        NGOs outside this distance cannot claim your food.
                      </span>
                    </label>

                    <label style={{ display: 'block' }}>
                      <span style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '8px' }}>Food Posting Policy</span>
                      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>Controls the safety requirements that must be completed before posting donated food.</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '10px', borderRadius: '10px', border: `2px solid ${settingsForm.foodPostingPolicy === 'strict' ? '#22c55e' : '#e2e8f0'}`, background: settingsForm.foodPostingPolicy === 'strict' ? '#f0fdf4' : '#fff' }}>
                          <input type="radio" name="foodPostingPolicy" value="strict" checked={settingsForm.foodPostingPolicy === 'strict'} onChange={() => setSettingsForm({ ...settingsForm, foodPostingPolicy: 'strict' })} style={{ marginTop: '2px' }} />
                          <div>
                            <span style={{ fontWeight: '700', fontSize: '13px' }}>Strict Safety Checklist — Mandatory</span>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>NGOs see full safety confirmation. Checklist must be completed before publishing any food post.</p>
                          </div>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '10px', borderRadius: '10px', border: `2px solid ${settingsForm.foodPostingPolicy === 'standard' ? '#3b82f6' : '#e2e8f0'}`, background: settingsForm.foodPostingPolicy === 'standard' ? '#eff6ff' : '#fff' }}>
                          <input type="radio" name="foodPostingPolicy" value="standard" checked={settingsForm.foodPostingPolicy === 'standard'} onChange={() => setSettingsForm({ ...settingsForm, foodPostingPolicy: 'standard' })} style={{ marginTop: '2px' }} />
                          <div>
                            <span style={{ fontWeight: '700', fontSize: '13px' }}>Standard Safety Checklist</span>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Safety checklist is shown but optional. Food can be published without mandatory completion.</p>
                          </div>
                        </label>
                      </div>
                    </label>
                  </div>

                  {/* Card 2: Claim Preferences */}
                  <div className="settings-card">
                    <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '4px' }}>Claim Preferences</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Manage how NGO food claims are processed and approved.</p>

                    <label style={{ display: 'block' }}>
                      <span style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>NGO Claim Approval</span>
                      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>Choose whether NGO food claims require your approval before pickup.</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '10px', borderRadius: '10px', border: `2px solid ${settingsForm.ngoClaimApproval === 'restaurant_approval' ? '#f59e0b' : '#e2e8f0'}`, background: settingsForm.ngoClaimApproval === 'restaurant_approval' ? '#fffbeb' : '#fff' }}>
                          <input type="radio" name="ngoClaimApproval" value="restaurant_approval" checked={settingsForm.ngoClaimApproval === 'restaurant_approval'} onChange={() => setSettingsForm({ ...settingsForm, ngoClaimApproval: 'restaurant_approval' })} style={{ marginTop: '2px' }} />
                          <div>
                            <span style={{ fontWeight: '700', fontSize: '13px' }}>● Restaurant approval required</span>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Claims go to Pending state. You must Approve or Reject each claim before the NGO can proceed with pickup.</p>
                          </div>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '10px', borderRadius: '10px', border: `2px solid ${settingsForm.ngoClaimApproval === 'automatic_approval' ? '#22c55e' : '#e2e8f0'}`, background: settingsForm.ngoClaimApproval === 'automatic_approval' ? '#f0fdf4' : '#fff' }}>
                          <input type="radio" name="ngoClaimApproval" value="automatic_approval" checked={settingsForm.ngoClaimApproval === 'automatic_approval'} onChange={() => setSettingsForm({ ...settingsForm, ngoClaimApproval: 'automatic_approval' })} style={{ marginTop: '2px' }} />
                          <div>
                            <span style={{ fontWeight: '700', fontSize: '13px' }}>○ Automatic approval</span>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Claims are immediately approved and the NGO can proceed to pickup without waiting for your confirmation.</p>
                          </div>
                        </label>
                      </div>
                    </label>
                  </div>

                  {/* Card 3: Notifications */}
                  <div className="settings-card">
                    <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '4px' }}>Notifications</h3>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Control which system notifications you receive from FoodBridge.</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '13px', fontWeight: '700', display: 'block' }}>Claim & Pickup Notifications</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                          Receive notifications for food claims, pickup updates and donation completion.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingsForm({ ...settingsForm, claimPickupNotifications: !settingsForm.claimPickupNotifications })}
                        style={{
                          width: '52px', height: '28px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                          background: settingsForm.claimPickupNotifications ? '#22c55e' : '#cbd5e1',
                          position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: '16px'
                        }}
                      >
                        <span style={{
                          position: 'absolute', top: '4px',
                          left: settingsForm.claimPickupNotifications ? '28px' : '4px',
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: '#fff', transition: 'left 0.2s', display: 'block'
                        }} />
                      </button>
                    </div>
                    <p style={{ fontSize: '12px', marginTop: '10px', fontWeight: '700', color: settingsForm.claimPickupNotifications ? '#22c55e' : '#ef4444' }}>
                      {settingsForm.claimPickupNotifications ? '● Notifications are ON' : '○ Notifications are OFF'}
                    </p>
                  </div>

                  {/* Save button */}
                  <button type="submit" className="primary" style={{ alignSelf: 'flex-start', padding: '12px 32px', fontSize: '14px', fontWeight: '800', borderRadius: '10px' }}>
                    Save Changes
                  </button>
                </div>

                {/* Right Column: Account Overview */}
                <div className="settings-card">
                  <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '16px' }}>Account Overview</h3>
                  <ul className="settings-list">
                    <li><span>Total posts</span><strong>{dashboard.summary.totalPosts || 0}</strong></li>
                    <li><span>Food donated</span><strong>{dashboard.summary.totalFoodKg || 0} kg</strong></li>
                    <li><span>Completed pickups</span><strong>{dashboard.summary.completedPickups || 0}</strong></li>
                    <li><span>Average rating</span><strong>{dashboard.summary.avgRating || '0.0'} ★</strong></li>
                  </ul>
                  <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                  <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: '#64748b' }}>Active Settings Summary</h4>
                  <ul className="settings-list" style={{ fontSize: '12px' }}>
                    <li><span>Pickup radius</span><strong>{settingsForm.maximumNGOPickupDistance} km</strong></li>
                    <li><span>Posting policy</span><strong>{settingsForm.foodPostingPolicy === 'strict' ? 'Strict' : 'Standard'}</strong></li>
                    <li><span>Claim approval</span><strong>{settingsForm.ngoClaimApproval === 'restaurant_approval' ? 'Manual' : 'Automatic'}</strong></li>
                    <li><span>Notifications</span><strong style={{ color: settingsForm.claimPickupNotifications ? '#22c55e' : '#ef4444' }}>{settingsForm.claimPickupNotifications ? 'ON' : 'OFF'}</strong></li>
                  </ul>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Review NGO Modal */}
      {showReviewModal && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={submitNgoReview}>
            <button type="button" onClick={() => setShowReviewModal(false)} className="close-btn">&times;</button>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Rate NGO Partner</h2>
            
            <label>Rating (1-5 Stars)
              <select value={reviewInput.rating} onChange={e => setReviewInput({ ...reviewInput, rating: e.target.value })}>
                <option value="5">5 Stars (Excellent)</option>
                <option value="4">4 Stars (Good)</option>
                <option value="3">3 Stars (Average)</option>
                <option value="2">2 Stars (Poor)</option>
                <option value="1">1 Star (Offensive/Unprofessional)</option>
              </select>
            </label>

            <label>Comments / Review Feedback
              <textarea required value={reviewInput.comment} onChange={e => setReviewInput({ ...reviewInput, comment: e.target.value })} placeholder="Describe their punctuality, cleanliness, and cooperation." />
            </label>

            <button type="submit" className="primary" style={{ width: '100%' }}>Submit Review</button>
          </form>
        </div>
      )}
    </div>
  );
}
