import apiClient from './apiClient';

export const customerApi = {
    getAll: (params) => apiClient.get('/customers', { params }),
    getById: (id) => apiClient.get(`/customers/${id}`),
};
