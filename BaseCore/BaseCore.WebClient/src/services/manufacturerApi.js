import apiClient from './apiClient';

export const manufacturerApi = {
    getAll: () => apiClient.get('/manufacturers'),
    getById: (id) => apiClient.get(`/manufacturers/${id}`),
    create: (data) => apiClient.post('/manufacturers', data),
    update: (id, data) => apiClient.put(`/manufacturers/${id}`, data),
    delete: (id) => apiClient.delete(`/manufacturers/${id}`),
};
