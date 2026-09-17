import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();

  const guestLinks = [
    ['/', 'Home'],
    ['/about', 'About'],
    ['/how-it-works', 'How It Works'],
    ['/impact', 'Impact'],
    ['/contact', 'Contact']
  ];

  const restaurantLinks = [
    ['/restaurant', 'Dashboard'],
    ['/about', 'About'],
    ['/contact', 'Contact'],
    ['/policy', 'Policy']
  ];

  const ngoLinks = [
    ['/ngo', 'Dashboard'],
    ['/about', 'About'],
    ['/contact', 'Contact'],
    ['/policy', 'Policy']
  ];

  const adminLinks = [
    ['/admin', 'Dashboard'],
    ['/admin/restaurants', 'Restaurants'],
    ['/admin/ngos', 'NGOs'],
    ['/admin/foods', 'Food Posts'],
    ['/admin/claims', 'Claims'],
    ['/admin/reports', 'Reports'],
    ['/admin/analytics', 'Analytics'],
    ['/admin/notifications', 'Notifications'],
    ['/admin/settings', 'Settings']
  ];

  const links = !user
    ? guestLinks
    : user.role === 'restaurant'
      ? restaurantLinks
      : user.role === 'ngo'
        ? ngoLinks
        : [];

  return (
    <header className="navbar">
      <Link className="brand" to="/">FoodBridge</Link>
      <nav>
        {links.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
        {!user && <NavLink to="/login">Login</NavLink>}
        {!user && <NavLink to="/register">Register</NavLink>}
        {user && <button className="logout-button" onClick={logout}>Logout</button>}
      </nav>
    </header>
  );
}
