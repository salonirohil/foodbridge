import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleCards = [
  { title: 'Restaurant donors', body: 'Share surplus meals, manage pickups, and track rescue impact from one dashboard.' },
  { title: 'NGO partners', body: 'Browse live food posts, claim safely, and coordinate collection in real time.' }
];

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'restaurant',
    phone: '',
    city: '',
    address: ''
  });
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');

    try {
      const result = await register(form);
      if (result.role === 'restaurant') navigate('/restaurant');
      else navigate('/ngo');
    } catch (err) {
      setError(err.response?.data?.message || 'Cannot register right now. Please review your details and try again.');
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell auth-shell-wide">
        <div className="auth-hero-card">
          <span className="auth-badge">New account</span>
          <span className="eyebrow">Join FoodBridge</span>
          <h2>Create a verified partner account</h2>
          <p>Register as a restaurant donor or NGO partner and begin coordinating surplus food with transparent status updates.</p>

          <div className="auth-highlight-list">
            {roleCards.map(item => (
              <article className="auth-highlight-card" key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </article>
            ))}
          </div>
        </div>

        <form className="auth-card auth-form-card" onSubmit={submit}>
          <div className="auth-card-head">
            <span className="eyebrow">Registration</span>
            <h1>Create your account</h1>
            <p>Your account will be created immediately and can then be reviewed by the admin panel if needed.</p>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="auth-form-grid auth-form-grid-two">
            <label>
              <span>Organization name</span>
              <input
                required
                value={form.name}
                onChange={event => setForm({ ...form, name: event.target.value })}
                placeholder="Hope Foundation / Grand Plaza Hotel"
              />
            </label>

            <label>
              <span>Email address</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={event => setForm({ ...form, email: event.target.value })}
                placeholder="info@example.com"
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                required
                value={form.password}
                onChange={event => setForm({ ...form, password: event.target.value })}
                placeholder="Create a secure password"
              />
            </label>

            <label>
              <span>Account type</span>
              <select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}>
                <option value="restaurant">Restaurant donor</option>
                <option value="ngo">NGO partner</option>
              </select>
            </label>

            <label>
              <span>Phone number</span>
              <input
                required
                value={form.phone}
                onChange={event => setForm({ ...form, phone: event.target.value })}
                placeholder="+91 98XXXXXXXX"
              />
            </label>

            <label>
              <span>City</span>
              <input
                required
                value={form.city}
                onChange={event => setForm({ ...form, city: event.target.value })}
                placeholder="Mumbai"
              />
            </label>
          </div>

          <label>
            <span>Address</span>
            <textarea
              required
              value={form.address}
              onChange={event => setForm({ ...form, address: event.target.value })}
              placeholder="Street, area, landmark, and full pickup or office location"
            />
          </label>

          <button className="primary auth-submit-button">Create Account</button>

          <div className="auth-footnote">
            <p>Already have an account? <Link to="/login">Login here</Link></p>
          </div>
        </form>
      </section>
    </main>
  );
}
