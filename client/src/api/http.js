import axios from 'axios';

const host = window.location.hostname;
const defaultApiUrl = host === 'localhost' || host === '127.0.0.1'
  ? 'http://localhost:5000'
  : `http://${host}:5000`;

export const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

export const http = axios.create({
  baseURL: `${API_URL}/api`
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('foodbridge_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
