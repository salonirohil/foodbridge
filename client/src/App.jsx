import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { FoodFeed } from './pages/FoodFeed';
import { RestaurantDashboard } from './pages/RestaurantDashboard';
import { NgoDashboard } from './pages/NgoDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { InfoPage } from './pages/InfoPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<InfoPage type="about" />} />
          <Route path="/how-it-works" element={<InfoPage type="how-it-works" />} />
          <Route path="/impact" element={<InfoPage type="impact" />} />
          <Route path="/contact" element={<InfoPage type="contact" />} />
          <Route path="/policy" element={<InfoPage type="policy" />} />
          <Route path="/profile" element={<ProtectedRoute><InfoPage type="profile" /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><InfoPage type="notifications" /></ProtectedRoute>} />
          <Route path="/restaurant/history" element={<ProtectedRoute roles={['restaurant']}><InfoPage type="history" /></ProtectedRoute>} />
          <Route path="/ngo/claims" element={<ProtectedRoute roles={['ngo']}><InfoPage type="history" /></ProtectedRoute>} />
          <Route path="/unauthorized" element={<InfoPage type="unauthorized" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin-login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/feed" element={<ProtectedRoute><FoodFeed /></ProtectedRoute>} />
          <Route path="/restaurant" element={<ProtectedRoute roles={['restaurant']}><RestaurantDashboard /></ProtectedRoute>} />
          <Route path="/ngo" element={<ProtectedRoute roles={['ngo']}><NgoDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/:section" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<InfoPage type="notfound" />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
