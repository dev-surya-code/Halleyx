import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wf_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('wf_token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    const message = error.response?.data?.message || error.message || 'An error occurred';
    if (error.response?.status !== 401) {
      toast.error(message, { toastId: message });
    }

    return Promise.reject(error);
  }
);

// ── Workflow APIs ──
export const workflowAPI = {
  getAll: (params) => api.get('/workflows', { params }),
  getById: (id) => api.get(`/workflows/${id}`),
  create: (data) => api.post('/workflows', data),
  update: (id, data) => api.put(`/workflows/${id}`, data),
  delete: (id) => api.delete(`/workflows/${id}`),
  toggle: (id) => api.patch(`/workflows/${id}/toggle`),
  duplicate: (id) => api.post(`/workflows/${id}/duplicate`),
  execute: (id, data) => api.post(`/workflows/${id}/execute`, { data }),
  getExecutions: (id, params) => api.get(`/workflows/${id}/executions`, { params })
};

// ── Step APIs ──
export const stepAPI = {
  getAll: (workflowId) => api.get(`/workflows/${workflowId}/steps`),
  create: (workflowId, data) => api.post(`/workflows/${workflowId}/steps`, data),
  update: (id, data) => api.put(`/steps/${id}`, data),
  delete: (id) => api.delete(`/steps/${id}`),
  reorder: (workflowId, steps) => api.put(`/workflows/${workflowId}/steps/reorder`, { steps })
};

// ── Rule APIs ──
export const ruleAPI = {
  getAll: (stepId) => api.get(`/steps/${stepId}/rules`),
  create: (stepId, data) => api.post(`/steps/${stepId}/rules`, data),
  update: (id, data) => api.put(`/rules/${id}`, data),
  delete: (id) => api.delete(`/rules/${id}`),
  validate: (condition) => api.post('/rules/validate', { condition }),
  reorder: (stepId, rules) => api.put(`/steps/${stepId}/rules/reorder`, { rules })
};

// ── Execution APIs ──
export const executionAPI = {
  getAll: (params) => api.get('/executions', { params }),
  getById: (id) => api.get(`/executions/${id}`),
  cancel: (id) => api.post(`/executions/${id}/cancel`),
  retry: (id) => api.post(`/executions/${id}/retry`),
  approve: (id, data) => api.post(`/executions/${id}/approve`, data)
};

// ── Dashboard APIs ──
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getTrend: (days) => api.get('/dashboard/execution-trend', { params: { days } }),
  getTopWorkflows: () => api.get('/dashboard/top-workflows'),
  getRecentExecutions: () => api.get('/dashboard/recent-executions'),
  getStatusDistribution: () => api.get('/dashboard/status-distribution')
};

export default api;
