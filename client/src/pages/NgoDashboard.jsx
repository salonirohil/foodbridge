import React, { useEffect, useState } from 'react';
import { http } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { 
  DashboardIcon, FoodIcon, FeedIcon, ClaimIcon, ReviewIcon, 
  NotificationIcon, SettingsIcon, ProfileIcon, LogoutIcon, 
  VerifiedBadgeIcon, MapIcon, GpsIcon 
} from '../components/Icons';

export function NgoDashboard() {
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState(() => window.location.hash.replace('#', '') || 'dashboard');
  const [claims, setClaims] = useState([]);
  const [foods, setFoods] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Feed filter states
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vegFilter, setVegFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');

  // Profile fields
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

  // Rate restaurant states
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

  async function loadClaims() {
    try {
      const { data } = await http.get('/claims/mine');
      setClaims(data);
    } catch (err) {}
  }

  async function loadFoods() {
    try {
      const { data } = await http.get('/foods');
      setFoods(data);
    } catch (err) {}
  }

  async function loadReviews() {
    try {
      const { data } = await http.get('/reviews/submitted');
      setReviews(data);
    } catch (err) {}
  }

  async function loadNotifications() {
    try {
      const { data } = await http.get('/notifications');
      setNotifications(data);
    } catch (err) {}
  }

  useEffect(() => {
    loadClaims();
    loadFoods();
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
    }
  }, [user]);

  async function claimFood(foodId) {
    setError('');
    setMessage('');
    try {
      await http.post('/claims', { foodId });
      setMessage('Food claimed successfully! Coordinates are ready under My Claims.');
      loadClaims();
      loadFoods();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not claim food');
    }
  }

  async function cancelClaim(id) {
    if (!window.confirm('Cancel this active claim?')) return;
    setError('');
    setMessage('');
    try {
      await http.patch(`/claims/${id}/cancel`);
      setMessage('Claim cancelled');
      loadClaims();
      loadFoods();
    } catch (err) {
      setError('Could not cancel claim');
    }
  }

  // Submit Restaurant review
  async function submitRestaurantReview(e) {
    e.preventDefault();
    try {
      await http.post('/reviews', reviewInput);
      setMessage('Restaurant review submitted successfully');
      setShowReviewModal(false);
      loadReviews();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit review');
    }
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
      setMessage('Profile image uploaded. Save details to publish it.');
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

  // Notification management
  async function markNotificationRead(id) {
    await http.patch(`/notifications/${id}/read`);
    loadNotifications();
  }

  async function deleteNotification(id) {
    await http.delete(`/notifications/${id}`);
    loadNotifications();
  }

  // Download Report
  function downloadCsvClaims() {
    const headers = ['Claim ID', 'Food Name', 'Quantity (kg)', 'Restaurant Name', 'Pickup Time', 'Claim Status', 'Claimed Date'];
    const rows = claims.map(c => [
      c.id, c.name, c.quantity_kg, c.restaurant_name, c.pickup_time, c.status, c.claimed_at
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `foodbridge_ngo_claims_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Calculate metrics
  const completedClaims = claims.filter(c => c.status === 'collected');
  const activeClaims = claims.filter(c => c.status === 'claimed');
  const totalFoodReceivedKg = completedClaims.reduce((acc, c) => acc + Number(c.quantity_kg), 0);
  const mealsReceived = Math.round(totalFoodReceivedKg * 4);
  const co2Saved = Math.round(totalFoodReceivedKg * 2.5);

  // Filter food feed
  const filteredFoods = foods.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.address.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
    const matchesVeg = vegFilter === 'all' || f.veg_non_veg === vegFilter;
    return matchesSearch && matchesCategory && matchesVeg;
  });

  const sortedFoods = [...filteredFoods].sort((a, b) => {
    if (sortBy === 'quantity') return b.quantity_kg - a.quantity_kg;
    if (sortBy === 'expiry') return new Date(a.expiry_time) - new Date(b.expiry_time);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <h2 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: '#64748b', padding: '0 14px', marginBottom: '16px' }}>
          NGO Panel
        </h2>
        <a href="#dashboard" onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'active' : ''}>
          <DashboardIcon /> Dashboard
        </a>
        <a href="#feed" onClick={() => setActiveTab('feed')} className={activeTab === 'feed' ? 'active' : ''}>
          <FeedIcon /> Food Feed
        </a>
        <a href="#claims" onClick={() => setActiveTab('claims')} className={activeTab === 'claims' ? 'active' : ''}>
          <ClaimIcon /> My Claims
        </a>
        <a href="#reviews" onClick={() => setActiveTab('reviews')} className={activeTab === 'reviews' ? 'active' : ''}>
          <ReviewIcon /> Reviews Given
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
        {/* Verification banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>{user?.name}</h1>
              {user?.isVerified && (
                <span className="badge badge-available" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', fontSize: '11px' }}>
                  <VerifiedBadgeIcon /> Verified NGO
                </span>
              )}
            </div>
            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>Welcome back. Find nearby surplus food posts and coordinate collection details.</p>
          </div>
          {activeTab === 'dashboard' && (
            <button className="primary" onClick={() => setActiveTab('feed')}>
              <FeedIcon /> Explore Food Feed
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
            {/* Overview cards */}
            <div className="metric-row">
              <div className="metric">
                <strong>{foods.length}</strong>
                <span>Available Food</span>
              </div>
              <div className="metric metric-secondary">
                <strong>{activeClaims.length}</strong>
                <span>Active Claims</span>
              </div>
              <div className="metric">
                <strong>{completedClaims.length}</strong>
                <span>Completed Pickups</span>
              </div>
              <div className="metric metric-secondary">
                <strong>{mealsReceived}</strong>
                <span>Meals Distributed</span>
              </div>
            </div>

            {/* Dashboard lists */}
            <div className="two-column">
              {/* Nearby available food posts list */}
              <div className="panel">
                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Nearby Available Food</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sortedFoods.slice(0, 3).map(food => (
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
                          <span style={{ fontSize: '10px', fontWeight: '700', color: food.veg_non_veg === 'veg' ? '#22c55e' : '#ef4444', textTransform: 'uppercase' }}>
                            {food.veg_non_veg}
                          </span>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                          {food.quantity_kg} kg | Donor: <strong>{food.restaurant_name}</strong>
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                          <a className="map-link" style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(food.address)}`} target="_blank" rel="noreferrer">
                            <MapIcon className="h-4 w-4" /> View Map
                          </a>
                          <button onClick={() => claimFood(food.id)} className="primary" style={{ padding: '4px 12px', fontSize: '11px' }}>
                            Claim Now
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {sortedFoods.length === 0 && <p style={{ color: '#64748b' }}>No food posts available at this time.</p>}
                </div>
              </div>

              {/* My active claims list */}
              <div className="panel">
                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>My Active Claims</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {activeClaims.slice(0, 3).map(claim => (
                    <div key={claim.id} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700' }}>{claim.name}</h3>
                        <span className="badge badge-pending">Claimed</span>
                      </div>
                      <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>
                        Quantity: {claim.quantity_kg} kg | Restaurant: <strong>{claim.restaurant_name}</strong>
                      </p>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                        <a className="button" style={{ padding: '4px 10px', fontSize: '11px', textDecoration: 'none' }} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(claim.address)}`} target="_blank" rel="noreferrer">
                          Navigate Maps
                        </a>
                        <button onClick={() => cancelClaim(claim.id)} className="danger" style={{ padding: '4px 10px', fontSize: '11px' }}>Cancel Claim</button>
                      </div>
                    </div>
                  ))}
                  {activeClaims.length === 0 && <p style={{ color: '#64748b' }}>No active claims right now.</p>}
                </div>
              </div>
            </div>

            {/* Impact counter section with nice graphic widgets */}
            <div className="panel" style={{ marginTop: '28px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Impact Created by Your Organization</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="grid">
                <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <strong style={{ display: 'block', fontSize: '28px', color: '#22c55e' }}>{mealsReceived}</strong>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Meals Distributed</span>
                </div>
                <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <strong style={{ display: 'block', fontSize: '28px', color: '#3b82f6' }}>{totalFoodReceivedKg} kg</strong>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Food Rescued</span>
                </div>
                <div style={{ background: '#fff7ed', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <strong style={{ display: 'block', fontSize: '28px', color: '#f97316' }}>{co2Saved} kg</strong>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>CO2 Saved</span>
                </div>
                <div style={{ background: '#faf5ff', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
                  <strong style={{ display: 'block', fontSize: '28px', color: '#a855f7' }}>{Math.round(mealsReceived / 3)}</strong>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Lives Impacted</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Food Feed */}
        {activeTab === 'feed' && (
          <div className="panel">
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Available Foods Feed</h2>
            
            {/* Search and Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }} className="grid">
              <input type="text" placeholder="Search by name, restaurant..." value={search} onChange={e => setSearch(e.target.value)} />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                <option value="Cooked Meals">Cooked Meals</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Bakery">Bakery</option>
                <option value="Dairy">Dairy</option>
                <option value="Others">Others</option>
              </select>
              <select value={vegFilter} onChange={e => setVegFilter(e.target.value)}>
                <option value="all">All Dietary Types</option>
                <option value="veg">Vegetarian</option>
                <option value="non-veg">Non-Vegetarian</option>
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="created_at">Sort by Date</option>
                <option value="quantity">Sort by Quantity</option>
                <option value="expiry">Sort by Expiry</option>
              </select>
            </div>

            <div className="grid">
              {sortedFoods.map(food => (
                <div className="card" key={food.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {food.image_url && <img className="food-image" src={food.image_url} alt={food.name} onError={e => e.currentTarget.style.display = 'none'} />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{food.name}</h3>
                      <span className="badge badge-available" style={{ color: food.veg_non_veg === 'veg' ? '#22c55e' : '#ef4444', borderColor: food.veg_non_veg === 'veg' ? '#bbf7d0' : '#fecaca', background: food.veg_non_veg === 'veg' ? '#f0fdf4' : '#fef2f2' }}>
                        {food.veg_non_veg}
                      </span>
                    </div>
                    <p style={{ color: '#64748b' }}>Quantity: <strong>{food.quantity_kg} kg</strong></p>
                    <p style={{ color: '#64748b' }}>Category: {food.category}</p>
                    <p style={{ color: '#64748b' }}>Expiry: {new Date(food.expiry_time).toLocaleString()}</p>
                    <p style={{ color: '#64748b' }}>Donor: <strong>{food.restaurant_name}</strong></p>
                    {food.special_instructions && <p style={{ color: '#f97316', fontSize: '12px', marginTop: '8px' }}><strong>Note:</strong> {food.special_instructions}</p>}
                    {food.description && <p style={{ color: '#475569', fontSize: '12px', marginTop: '6px' }}>{food.description}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <a className="button" style={{ flex: 1, padding: '8px 12px' }} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(food.address)}`} target="_blank" rel="noreferrer">
                      View Map
                    </a>
                    <button className="primary" style={{ flex: 1, padding: '8px 12px' }} onClick={() => claimFood(food.id)}>
                      Claim Food
                    </button>
                  </div>
                </div>
              ))}
              {sortedFoods.length === 0 && <p style={{ color: '#64748b' }}>No food postings matches search query.</p>}
            </div>
          </div>
        )}

        {/* Tab 3: Claims History */}
        {activeTab === 'claims' && (
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Your Claims & Collections</h2>
              <button className="primary" onClick={downloadCsvClaims}>
                Download Claims Report
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: '700' }}>
                    <th style={{ padding: '12px' }}>Food Name</th>
                    <th style={{ padding: '12px' }}>Quantity</th>
                    <th style={{ padding: '12px' }}>Restaurant Donor</th>
                    <th style={{ padding: '12px' }}>Pickup Deadline</th>
                    <th style={{ padding: '12px' }}>Address</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map(claim => (
                    <tr key={claim.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px', fontWeight: '700' }}>{claim.name}</td>
                      <td style={{ padding: '12px' }}>{claim.quantity_kg} kg</td>
                      <td style={{ padding: '12px' }}>{claim.restaurant_name}</td>
                      <td style={{ padding: '12px' }}>{new Date(claim.pickup_time).toLocaleString()}</td>
                      <td style={{ padding: '12px', fontSize: '12px' }}>{claim.address}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge badge-${claim.status}`}>{claim.status}</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {claim.status === 'claimed' && (
                          <button onClick={() => cancelClaim(claim.id)} className="danger" style={{ padding: '4px 8px', fontSize: '11px' }}>Cancel</button>
                        )}
                        {claim.status === 'collected' && (
                          <button onClick={() => {
                            setReviewInput({ claimId: claim.id, rating: 5, comment: '' });
                            setShowReviewModal(true);
                          }} className="button secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                            Rate Restaurant
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {claims.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No claims recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Reviews Given */}
        {activeTab === 'reviews' && (
          <div className="panel">
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Reviews Submitted to Donors</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {reviews.map(review => (
                <div key={review.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '800' }}>Recipient Restaurant: {review.recipient_name}</h3>
                    <span style={{ color: '#f97316', fontWeight: '800' }}>{review.rating} ★</span>
                  </div>
                  <p style={{ fontStyle: 'italic', color: '#475569' }}>"{review.comment || 'No comment provided.'}"</p>
                  <p style={{ color: '#94a3b8', fontSize: '11px', marginTop: '8px' }}>Submitted on: {new Date(review.created_at).toLocaleDateString()}</p>
                </div>
              ))}
              {reviews.length === 0 && <p style={{ color: '#64748b' }}>You haven't submitted any restaurant reviews yet.</p>}
            </div>
          </div>
        )}

        {/* Tab 5: Notifications */}
        {activeTab === 'notifications' && (
          <div className="panel">
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>NGO Alerts & Notifications</h2>
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
              {notifications.length === 0 && <p style={{ color: '#64748b' }}>No notifications found.</p>}
            </div>
          </div>
        )}

        {/* Tab 6: Profile */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <form className="panel wide-panel" onSubmit={updateProfile}>
              <div className="profile-header">
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>NGO Organization Details</h2>
                  <p className="profile-subtitle">Manage your public NGO identity, mission details, and pickup coordination address.</p>
                </div>
                <div className="profile-avatar-card">
                  {profileForm.profileImageUrl ? (
                    <img className="profile-avatar-preview" src={profileForm.profileImageUrl} alt={profileForm.name || 'NGO profile'} />
                  ) : (
                    <div className="profile-avatar-placeholder">{(profileForm.name || 'NGO').slice(0, 2).toUpperCase()}</div>
                  )}
                  <input type="file" accept="image/*" onChange={e => uploadProfileImage(e.target.files?.[0])} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="grid">
                <label>Organization Name
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

              <label>Office Address
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
                <input value={profileForm.profileImageUrl} onChange={e => setProfileForm({ ...profileForm, profileImageUrl: e.target.value })} />
              </label>
              
              <label>Organization Mission / Description
                <textarea value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} />
              </label>

              <button type="submit" className="primary">Save Details</button>
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

        {/* Tab 7: Settings */}
        {activeTab === 'settings' && (
          <div className="panel wide-panel settings-shell">
            <div className="settings-header">
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>NGO Settings</h2>
                <p className="profile-subtitle">Tune how your team searches for food and review your current operating account details.</p>
              </div>
              <div className="settings-status-card">
                <strong>{user?.isVerified ? 'Verified account' : 'Pending verification'}</strong>
                <span>{user?.email}</span>
              </div>
            </div>

            <div className="settings-grid">
              <div className="settings-card">
                <h3>Claim preferences</h3>
                <p>Use these preferences while browsing the live feed.</p>
                <label>Preferred Claim Types
                  <select>
                    <option>All food (Veg and Non-Veg)</option>
                    <option>Vegetarian only</option>
                  </select>
                </label>
                <label>Preferred Radius limit (km)
                  <input type="number" defaultValue="15" />
                </label>
              </div>

              <div className="settings-card">
                <h3>Account overview</h3>
                <ul className="settings-list">
                  <li><span>Role</span><strong>NGO partner</strong></li>
                  <li><span>Completed pickups</span><strong>{completedClaims.length}</strong></li>
                  <li><span>Meals distributed</span><strong>{mealsReceived}</strong></li>
                  <li><span>Food rescued</span><strong>{totalFoodReceivedKg} kg</strong></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Review Restaurant Modal */}
      {showReviewModal && (
        <div className="modal-overlay">
          <form className="modal-content" onSubmit={submitRestaurantReview}>
            <button type="button" onClick={() => setShowReviewModal(false)} className="close-btn">&times;</button>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '16px' }}>Rate Restaurant Donor</h2>
            
            <label>Rating (1-5 Stars)
              <select value={reviewInput.rating} onChange={e => setReviewInput({ ...reviewInput, rating: e.target.value })}>
                <option value="5">5 Stars (Excellent Food & Cleanliness)</option>
                <option value="4">4 Stars (Good)</option>
                <option value="3">3 Stars (Average)</option>
                <option value="2">2 Stars (Poor Quality/Late)</option>
                <option value="1">1 Star (Spoiled/Hazardous)</option>
              </select>
            </label>

            <label>Comments / Review Feedback
              <textarea required value={reviewInput.comment} onChange={e => setReviewInput({ ...reviewInput, comment: e.target.value })} placeholder="Write feedback about the packaging, quality, or food safety guidelines followed." />
            </label>

            <button type="submit" className="primary" style={{ width: '100%' }}>Submit Feedback</button>
          </form>
        </div>
      )}
    </div>
  );
}
