import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  profile: () => api.get('/auth/profile'),
};

// Projects
export const projectAPI = {
  list: () => api.get('/projects/'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects/', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  dashboard: (id) => api.get(`/projects/${id}/dashboard`),
  autoGenerate: (id) => api.post(`/projects/${id}/auto-generate`),
};

// Risks
export const riskAPI = {
  list: (projectId) => api.get(`/risks/project/${projectId}`),
  create: (projectId, data) => api.post(`/risks/project/${projectId}`, data),
  update: (id, data) => api.put(`/risks/${id}`, data),
  delete: (id) => api.delete(`/risks/${id}`),
  taxonomy: () => api.get('/risks/taxonomy'),
  monitoring: (projectId) => api.get(`/risks/monitoring/${projectId}`),
  suggestMitigation: (data) => api.post('/risks/suggest-mitigation', data),
};

// Tasks
export const taskAPI = {
  list: (projectId) => api.get(`/risks/tasks/project/${projectId}`),
  create: (projectId, data) => api.post(`/risks/tasks/project/${projectId}`, data),
  update: (id, data) => api.put(`/risks/tasks/${id}`, data),
  delete: (id) => api.delete(`/risks/tasks/${id}`),
};

// Engines
export const engineAPI = {
  fuzzy: (projectId, factors) => api.post(`/engines/fuzzy/${projectId}`, { factors }),
  monteCarlo: (projectId, data) => api.post(`/engines/monte-carlo/${projectId}`, data),
  mlPredict: (projectId, data) => api.post(`/engines/ml-predict/${projectId}`, data),
  nlpAnalyze: (projectId, data) => api.post(`/engines/nlp-analyze/${projectId}`, data),
  simulations: (projectId, type) => api.get(`/engines/simulations/${projectId}`, { params: { type } }),
  nlpHistory: (projectId) => api.get(`/engines/nlp-history/${projectId}`),
};

export default api;
