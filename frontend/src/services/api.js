import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export const gatewayApi = {
  submitPrompt: (prompt) => api.post('/gateway/chat', { prompt }),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getAnalytics: () => api.get('/dashboard/analytics'),
};

export const logsApi = {
  getLogs: (params) => api.get('/logs', { params }),
  getLogDetails: (id) => api.get(`/logs/${id}`),
};

export const policiesApi = {
  getPolicies: () => api.get('/policies'),
  updatePolicy: (id, data) => api.put(`/policies/${id}`, data),
};

export const redTeamApi = {
  runSuite: (params) => api.post('/redteam/run', params),
  runCategory: (category) => api.post(`/redteam/run/category/${category}`),
  getReports: () => api.get('/redteam/reports'),
  getReportDetails: (id) => api.get(`/redteam/reports/${id}`),
  exportReport: (id, format) => api.get(`/redteam/reports/${id}/export`, { params: { format }, responseType: 'blob' }),
};

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  getProfile: () => api.get('/auth/me'),
  createUser: (userData) => api.post('/auth/users', userData),
  listUsers: () => api.get('/auth/users'),
  updateUserRole: (userId, role) => api.put(`/auth/users/${userId}/role`, { role }),
  disableUser: (userId, isActive) => api.put(`/auth/users/${userId}/disable`, { is_active: isActive }),
};

export const settingsApi = {
  getSettings: () => api.get('/settings'),
  updateSettings: (settingsData) => api.put('/settings', settingsData),
};

export default api;
