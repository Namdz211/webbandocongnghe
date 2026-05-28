import apiClient from './apiClient';

export const couponApi = {
    getAll: (params) => apiClient.get('/coupons', { params }),
    getById: (id) => apiClient.get(`/coupons/${id}`),
    validate: (code, orderAmount) => apiClient.get(`/coupons/validate/${code}`, { params: { orderAmount } }),
    create: (data) => apiClient.post('/coupons', data),
    update: (id, data) => apiClient.put(`/coupons/${id}`, data),
    toggle: (id) => apiClient.patch(`/coupons/${id}/toggle`),
    delete: (id) => apiClient.delete(`/coupons/${id}`),
};
