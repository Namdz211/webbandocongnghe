import apiClient from './apiClient';

export const productApi = {
    getAll: (params) => apiClient.get('/products', { params }),
    search: (params) => apiClient.get('/products', { params }),
    getById: (id) => apiClient.get(`/products/${id}`),
    create: (data) => apiClient.post('/products', data),
    update: (id, data) => apiClient.put(`/products/${id}`, data),
    delete: (id) => apiClient.delete(`/products/${id}`),
};
