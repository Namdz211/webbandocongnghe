import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle response errors
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

// Auth API
export const authApi = {
    login: (username, password) => api.post('/auth/login', { username, password }),
    register: (data) => api.post('/auth/register', data),
};

// User API
export const userApi = {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
};

// Product API
export const productApi = {
    getAll: (params) => api.get('/products', { params }),
    search: (params) => api.get('/products', { params }),
    getById: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
};

// Category API
export const categoryApi = {
    getAll: () => api.get('/categories'),
    getById: (id) => api.get(`/categories/${id}`),
    create: (data) => api.post('/categories', data),
    update: (id, data) => api.put(`/categories/${id}`, data),
    delete: (id) => api.delete(`/categories/${id}`),
};

// Coupon API
export const couponApi = {
    getAll: (params) => api.get('/coupons', { params }),
    getById: (id) => api.get(`/coupons/${id}`),
    validate: (code, orderAmount) => api.get(`/coupons/validate/${code}`, { params: { orderAmount } }),
    create: (data) => api.post('/coupons', data),
    update: (id, data) => api.put(`/coupons/${id}`, data),
    toggle: (id) => api.patch(`/coupons/${id}/toggle`),
    delete: (id) => api.delete(`/coupons/${id}`),
};

// Order API
export const orderApi = {
    create: (data) => api.post('/orders', data),
    getMyOrders: () => api.get('/orders'),
    getAllForAdmin: () => api.get('/orders/all'),
    getById: (id) => api.get(`/orders/${id}`),
    confirm: (id) => api.put(`/orders/${id}/admin/confirm`),
    ship: (id) => api.put(`/orders/${id}/admin/ship`),
};

// Statistics API
export const statisticsApi = {
    getRevenue: (startDate, endDate) => api.get('/statistics/revenue', { params: { startDate, endDate } }),
    getInventory: () => api.get('/statistics/inventory'),
};

export default api;
