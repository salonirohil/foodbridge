import axios from 'axios';
import { handleMockRequest } from './mockData';

const isGithubPages = window.location.hostname.includes('github.io');
const host = window.location.hostname;
const defaultApiUrl = host === 'localhost' || host === '127.0.0.1'
  ? 'http://localhost:5000'
  : `https://${host}`;

export const API_URL = import.meta.env.VITE_API_URL || (isGithubPages ? '' : defaultApiUrl);

export const http = axios.create({
  baseURL: API_URL ? `${API_URL}/api` : '/api'
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('foodbridge_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const isNetworkErr = !error.response || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error');
    const isGithub = window.location.hostname.includes('github.io');

    if (isNetworkErr || isGithub) {
      console.warn(`[FoodBridge Demo Mode] Server offline, simulating response for: ${error.config?.url}`);
      try {
        let reqData = null;
        if (error.config?.data) {
          reqData = typeof error.config.data === 'string' ? JSON.parse(error.config.data) : error.config.data;
        }
        const mockResult = handleMockRequest(error.config?.url || '', error.config?.method || 'get', reqData);
        return Promise.resolve({ data: mockResult, status: 200, statusText: 'OK', config: error.config });
      } catch (mockErr) {
        console.error('Mock handling error:', mockErr);
      }
    }
    return Promise.reject(error);
  }
);
