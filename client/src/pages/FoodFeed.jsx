import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, http } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { MapIcon } from '../components/Icons';

export function FoodFeed() {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [message, setMessage] = useState('');

  async function loadFoods() {
    const { data } = await http.get('/foods');
    setFoods(data);
  }

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    loadFoods();
    const socket = io(API_URL);
    socket.on('food:created', loadFoods);
    socket.on('food:claimed', payload => setFoods(current => current.filter(food => food.id !== payload.foodId)));
    socket.on('food:updated', loadFoods);
    socket.on('food:deleted', loadFoods);
    socket.on('food:changed', loadFoods);
    return () => socket.disconnect();
  }, []);

  async function claim(foodId) {
    setMessage('');
    try {
      await http.post('/claims', { foodId });
      setMessage('Food claimed successfully. Coordination coordinates are ready in your NGO dashboard!');
      loadFoods();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not claim food');
    }
  }

  return (
    <main className="page">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>Surplus Food Feed</h1>
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>Browse surplus food listings available for claiming in real-time.</p>
      </div>

      {message && (
        <p className="notice" style={{ marginBottom: '24px' }}>
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} aria-label="Close message">&times;</button>
        </p>
      )}
      
      {foods.length === 0 && (
        <p className="notice">No active food posts right now. Listings appear here when posted and before they expire.</p>
      )}

      <section className="grid">
        {foods.map(food => (
          <article className="card" key={food.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {food.image_url && (
                <img 
                  className="food-image" 
                  src={food.image_url} 
                  alt={food.name} 
                  onError={e => { e.currentTarget.style.display = 'none'; }} 
                />
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800' }}>{food.name}</h2>
                <span className="badge badge-available" style={{ color: food.veg_non_veg === 'veg' ? '#22c55e' : '#ef4444', borderColor: food.veg_non_veg === 'veg' ? '#bbf7d0' : '#fecaca', background: food.veg_non_veg === 'veg' ? '#f0fdf4' : '#fef2f2' }}>
                  {food.veg_non_veg || 'veg'}
                </span>
              </div>
              <p style={{ color: '#64748b', fontSize: '13px' }}>Donor Restaurant: <strong>{food.restaurant_name}</strong></p>
              <p style={{ color: '#22c55e', fontWeight: '700', fontSize: '13px', marginTop: '4px' }}>Quantity: {food.quantity_kg} kg</p>
              <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>Category: {food.category || 'Cooked Meals'}</p>
              <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>Pickup Deadline: {new Date(food.pickup_time).toLocaleString()}</p>
              {food.special_instructions && (
                <p style={{ color: '#f97316', fontSize: '12px', marginTop: '10px' }}><strong>Note:</strong> {food.special_instructions}</p>
              )}
              {food.description && <p style={{ color: '#475569', fontSize: '12px', marginTop: '10px' }}>{food.description}</p>}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <a className="button" style={{ flex: 1, padding: '8px 12px' }} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(food.address)}`} target="_blank" rel="noreferrer">
                <MapIcon className="h-4 w-4" /> View Map
              </a>
              {user?.role === 'ngo' && (
                <button className="primary" style={{ flex: 1, padding: '8px 12px' }} onClick={() => claim(food.id)}>
                  Claim Now
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
