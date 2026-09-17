import { defaultCms } from '../data/defaultCms';

const STORAGE_FOODS_KEY = 'foodbridge_demo_foods';
const STORAGE_CLAIMS_KEY = 'foodbridge_demo_claims';
const STORAGE_USERS_KEY = 'foodbridge_demo_users';
const STORAGE_CMS_KEY = 'foodbridge_demo_cms';

export const initialMockUsers = [
  { id: 1, name: 'System Administrator', email: 'admin@foodbridge.test', role: 'admin', is_verified: 1, phone: '+91 98765 43210', organization: 'FoodBridge Central HQ', address: '124 Green Valley Tech District', created_at: '2026-01-15T09:00:00Z' },
  { id: 2, name: 'Green Harvest Bistro', email: 'restaurant@foodbridge.test', role: 'restaurant', is_verified: 1, phone: '+91 98765 43211', organization: 'Green Harvest Bistro', address: 'Central Avenue, Suite 4', created_at: '2026-02-01T10:30:00Z' },
  { id: 3, name: 'Artisan Bakery Co.', email: 'artisan@foodbridge.test', role: 'restaurant', is_verified: 1, phone: '+91 98765 43212', organization: 'Artisan Bakery', address: 'Market Square West #12', created_at: '2026-02-10T11:00:00Z' },
  { id: 4, name: 'Hope Food Rescue NGO', email: 'ngo@foodbridge.test', role: 'ngo', is_verified: 1, phone: '+91 98765 43213', organization: 'Hope Foundation', address: 'Community Center, Block 7', created_at: '2026-02-15T14:20:00Z' },
  { id: 5, name: 'Community Care Shelter', email: 'shelter@foodbridge.test', role: 'ngo', is_verified: 0, phone: '+91 98765 43214', organization: 'City Relief Trust', address: '44 Harbor Road', created_at: '2026-03-01T08:45:00Z' }
];

export const initialMockFoods = [
  {
    id: 101,
    restaurant_id: 2,
    restaurant_name: 'Green Harvest Bistro',
    title: 'Fresh Packaged Meals & Salads',
    food_type: 'Prepared Meals',
    quantity_kg: 25,
    pickup_address: 'Central Avenue, Suite 4',
    pickup_window: 'Today 5:00 PM - 8:00 PM',
    status: 'available',
    expiry_time: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 102,
    restaurant_id: 3,
    restaurant_name: 'Artisan Bakery Co.',
    title: 'Assorted Bakery Bread & Baguettes',
    food_type: 'Bakery',
    quantity_kg: 18,
    pickup_address: 'Market Square West #12',
    pickup_window: 'Today 6:00 PM - 9:00 PM',
    status: 'available',
    expiry_time: new Date(Date.now() + 172800000).toISOString(),
    created_at: new Date(Date.now() - 7200000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 103,
    restaurant_id: 2,
    restaurant_name: 'Green Harvest Bistro',
    title: 'Surplus Catering Buffet Trays',
    food_type: 'Hot Meals',
    quantity_kg: 35,
    pickup_address: 'Central Avenue, Suite 4',
    pickup_window: 'Today 4:00 PM - 7:00 PM',
    status: 'claimed',
    expiry_time: new Date(Date.now() + 43200000).toISOString(),
    created_at: new Date(Date.now() - 14400000).toISOString(),
    image_url: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80'
  }
];

export function getStoredFoods() {
  const data = localStorage.getItem(STORAGE_FOODS_KEY);
  if (data) {
    try { return JSON.parse(data); } catch (e) {}
  }
  localStorage.setItem(STORAGE_FOODS_KEY, JSON.stringify(initialMockFoods));
  return initialMockFoods;
}

export function saveStoredFoods(foods) {
  localStorage.setItem(STORAGE_FOODS_KEY, JSON.stringify(foods));
}

export function getStoredUsers() {
  const data = localStorage.getItem(STORAGE_USERS_KEY);
  if (data) {
    try { return JSON.parse(data); } catch (e) {}
  }
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(initialMockUsers));
  return initialMockUsers;
}

export function saveStoredUsers(users) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

export function getStoredClaims() {
  const data = localStorage.getItem(STORAGE_CLAIMS_KEY);
  if (data) {
    try { return JSON.parse(data); } catch (e) {}
  }
  return [
    {
      id: 201,
      food_id: 103,
      ngo_id: 4,
      ngo_name: 'Hope Food Rescue NGO',
      status: 'claimed',
      pickup_code: 'CLAIM-7892',
      food_title: 'Surplus Catering Buffet Trays',
      quantity_kg: 35,
      pickup_address: 'Central Avenue, Suite 4',
      created_at: new Date().toISOString()
    }
  ];
}

export function saveStoredClaims(claims) {
  localStorage.setItem(STORAGE_CLAIMS_KEY, JSON.stringify(claims));
}

export function getStoredCms() {
  const data = localStorage.getItem(STORAGE_CMS_KEY);
  if (data) {
    try { return JSON.parse(data); } catch (e) {}
  }
  return defaultCms;
}

export function saveStoredCms(cms) {
  localStorage.setItem(STORAGE_CMS_KEY, JSON.stringify(cms));
}

export function handleMockRequest(url, method = 'get', data = null) {
  const cleanUrl = url.replace(/^\/api/, '').replace(/^\/+/, '/');
  const lowerUrl = cleanUrl.toLowerCase();
  const lowerMethod = method.toLowerCase();

  // Auth: Login
  if (lowerUrl.includes('/auth/login') && lowerMethod === 'post') {
    const email = data?.email || 'admin@foodbridge.test';
    const users = getStoredUsers();
    let matched = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!matched) {
      const isRoleAdmin = email.includes('admin');
      const isRoleNgo = email.includes('ngo');
      matched = {
        id: Date.now(),
        name: isRoleAdmin ? 'Administrator' : isRoleNgo ? 'NGO Coordinator' : 'Restaurant Manager',
        email: email,
        role: isRoleAdmin ? 'admin' : isRoleNgo ? 'ngo' : 'restaurant',
        is_verified: 1,
        phone: '+91 98765 43210',
        organization: isRoleAdmin ? 'FoodBridge HQ' : isRoleNgo ? 'Partner NGO' : 'Donor Restaurant'
      };
      users.push(matched);
      saveStoredUsers(users);
    }

    return { user: matched, token: `demo-jwt-token-${matched.role}` };
  }

  // Auth: Register
  if (lowerUrl.includes('/auth/register') && lowerMethod === 'post') {
    const users = getStoredUsers();
    const newUser = {
      id: Date.now(),
      name: data.name || data.organization || 'New Member',
      email: data.email,
      role: data.role || 'restaurant',
      is_verified: 1,
      phone: data.phone || '+91 98765 43210',
      organization: data.organization || data.name || 'New Organization',
      address: data.address || 'City Center',
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    saveStoredUsers(users);
    return { user: newUser, token: `demo-jwt-token-${newUser.role}` };
  }

  // Public CMS
  if (lowerUrl.includes('/public/cms')) {
    return getStoredCms();
  }

  // Public Home
  if (lowerUrl.includes('/public/home')) {
    const foods = getStoredFoods();
    return {
      stats: {
        totalFoodSharedKg: 14850,
        availablePosts: foods.filter(f => f.status === 'available').length,
        completedPickups: 642,
        activeRestaurants: 128,
        activeNgos: 64
      },
      recentFoods: foods.slice(0, 3),
      recentReviews: [
        { id: 1, rating: 5, comment: 'Incredible initiative. We received fresh food within hours!', author_name: 'Hope Shelter' },
        { id: 2, rating: 5, comment: 'Easy to post surplus banquet meals. Very satisfied.', author_name: 'Royal Banquets' }
      ]
    };
  }

  // Public Partners
  if (lowerUrl.includes('/public/partners')) {
    return getStoredUsers().filter(u => u.role !== 'admin');
  }

  // Admin Dashboard
  if (lowerUrl.includes('/admin/dashboard')) {
    const users = getStoredUsers();
    const foods = getStoredFoods();
    return {
      summary: {
        totalUsers: users.length,
        pendingUsers: users.filter(u => !u.is_verified).length,
        totalFoods: foods.length,
        availableFoods: foods.filter(f => f.status === 'available').length,
        claimedFoods: foods.filter(f => f.status === 'claimed').length,
        collectedFoods: 15,
        totalKgSaved: 14850,
        co2SavedKg: 37125
      },
      users: users,
      foods: foods
    };
  }

  // Admin Users
  if (lowerUrl.includes('/admin/users')) {
    return getStoredUsers();
  }

  // Admin Foods
  if (lowerUrl.includes('/admin/foods')) {
    return getStoredFoods();
  }

  // Admin Claims
  if (lowerUrl.includes('/admin/claims')) {
    return getStoredClaims();
  }

  // Admin Reviews
  if (lowerUrl.includes('/admin/reviews')) {
    return [
      { id: 1, food_title: 'Buffet Meals', restaurant_name: 'Green Harvest Bistro', ngo_name: 'Hope NGO', rating: 5, comment: 'Excellent coordination!' }
    ];
  }

  // Admin Reports
  if (lowerUrl.includes('/admin/reports')) {
    return {
      auditLogs: [
        { id: 1, user_id: 1, action: 'User verification toggled', created_at: new Date().toISOString() },
        { id: 2, user_id: 2, action: 'Created food listing', created_at: new Date().toISOString() }
      ],
      openReports: []
    };
  }

  // Admin CMS Settings
  if (lowerUrl.includes('/admin/settings/cms')) {
    if (lowerMethod === 'put' || lowerMethod === 'post') {
      saveStoredCms(data);
      return data;
    }
    return getStoredCms();
  }

  // Foods Feed & Actions
  if (lowerUrl.startsWith('/foods') || lowerUrl === '/foods') {
    const foods = getStoredFoods();

    if (lowerMethod === 'post') {
      const currentUser = JSON.parse(localStorage.getItem('foodbridge_user') || '{}');
      const newFood = {
        id: Date.now(),
        restaurant_id: currentUser.id || 2,
        restaurant_name: currentUser.organization || currentUser.name || 'Green Harvest Bistro',
        title: data.title || 'Surplus Food Offering',
        food_type: data.food_type || 'Prepared Meals',
        quantity_kg: Number(data.quantity_kg || 10),
        pickup_address: data.pickup_address || currentUser.address || 'Central District',
        pickup_window: data.pickup_window || 'Today 6:00 PM - 9:00 PM',
        status: 'available',
        expiry_time: data.expiry_time || new Date(Date.now() + 86400000).toISOString(),
        created_at: new Date().toISOString(),
        image_url: data.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
      };
      foods.unshift(newFood);
      saveStoredFoods(foods);
      return newFood;
    }

    if (lowerUrl.includes('/restaurant/dashboard')) {
      return foods;
    }

    return foods;
  }

  // Claims
  if (lowerUrl.startsWith('/claims') || lowerUrl === '/claims') {
    const claims = getStoredClaims();
    const foods = getStoredFoods();

    if (lowerMethod === 'post') {
      const foodId = data?.food_id;
      const currentUser = JSON.parse(localStorage.getItem('foodbridge_user') || '{}');
      const targetFood = foods.find(f => f.id === Number(foodId));
      if (targetFood) {
        targetFood.status = 'claimed';
        saveStoredFoods(foods);
      }

      const newClaim = {
        id: Date.now(),
        food_id: foodId,
        ngo_id: currentUser.id || 4,
        ngo_name: currentUser.organization || currentUser.name || 'Hope Food Rescue NGO',
        status: 'claimed',
        pickup_code: `CLAIM-${Math.floor(1000 + Math.random() * 9000)}`,
        food_title: targetFood?.title || 'Claimed Food Listing',
        quantity_kg: targetFood?.quantity_kg || 10,
        pickup_address: targetFood?.pickup_address || 'City Center',
        created_at: new Date().toISOString()
      };
      claims.unshift(newClaim);
      saveStoredClaims(claims);
      return newClaim;
    }

    if (lowerUrl.includes('/mine')) {
      return claims;
    }

    return claims;
  }

  return { success: true, message: 'Operation simulated in Demo Mode' };
}
