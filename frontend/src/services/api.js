import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => API.post('/auth/login', data);
export const register = (data) => API.post('/auth/register', data);
export const getMe = () => API.get('/auth/me');
export const updateProfile = (data) => API.put('/auth/profile', data);
export const changePassword = (data) => API.put('/auth/change-password', data);

// Complaints
export const submitComplaint = (data) => API.post('/complaints', data);
export const getComplaints = (params) => API.get('/complaints', { params });
export const getComplaint = (id) => API.get(`/complaints/${id}`);
export const assignComplaint = (id, data) => API.post(`/complaints/${id}/assign`, data);
export const updateComplaintStatus = (id, data) => API.put(`/complaints/${id}/status`, data);
export const citizenVerify = (id, data) => API.post(`/complaints/${id}/verify`, data);
export const upvoteComplaint = (id) => API.post(`/complaints/${id}/upvote`);
export const getNearbyComplaints = (params) => API.get('/complaints/nearby', { params });
export const getDashboardStats = (params) => API.get('/complaints/stats', { params });
export const getComments = (id) => API.get(`/complaints/${id}/comments`);
export const addComment = (id, data) => API.post(`/complaints/${id}/comments`, data);

// Users / Officers
export const getOfficers = (params) => API.get('/users/officers', { params });
export const getOfficerPerformance = () => API.get('/users/officer-performance');
export const getAllUsers = (params) => API.get('/users', { params });
export const createUser = (data) => API.post('/users', data);
export const updateUser = (id, data) => API.put(`/users/${id}`, data);
export const toggleUserActive = (id) => API.put(`/users/${id}/toggle-active`);

// Audit & AI
export const getAuditLogs = (params) => API.get('/audit-logs', { params });
export const getAiAnomalies = () => API.get('/ai/anomalies');

// Departments
export const getDepartments = () => API.get('/departments');
export const createDepartment = (data) => API.post('/departments', data);
export const updateDepartment = (id, data) => API.put(`/departments/${id}`, data);

// Visits
export const createVisit = (data) => API.post('/visits', data);
export const getVisits = () => API.get('/visits');
export const getVisit = (id) => API.get(`/visits/${id}`);
export const addVisitLog = (id, data) => API.post(`/visits/${id}/log`, data);
export const completeVisit = (id, data) => API.put(`/visits/${id}/complete`, data);

// Notifications
export const getNotifications = (params) => API.get('/notifications', { params });
export const markNotificationRead = (id) => API.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => API.put('/notifications/read-all');

// MCD311
export const getMCD311Status = () => API.get('/mcd311/status');

// Public tracking (no auth required)
export const trackPublic = (ticketId) => API.get(`/track/${ticketId}`);

export default API;
