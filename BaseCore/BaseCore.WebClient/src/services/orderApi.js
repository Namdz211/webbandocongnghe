import apiClient from './apiClient';

export const orderApi = {
    create: (data) => apiClient.post('/orders', data),
    getMyOrders: () => apiClient.get('/orders'),
    getById: (id) => apiClient.get(`/orders/${id}`),
    getAll: (params) => apiClient.get('/orders/all', { params }),
    updateStatus: (id, status) => apiClient.put(`/orders/${id}/status`, { status }),
    cancel: (id) => apiClient.put(`/orders/${id}/cancel`),
    assignTransport: (id, data) => apiClient.post(`/orders/${id}/assign-transport`, data),
    updateDelivery: (id, data) => apiClient.put(`/orders/${id}/update-delivery`, data),
};
