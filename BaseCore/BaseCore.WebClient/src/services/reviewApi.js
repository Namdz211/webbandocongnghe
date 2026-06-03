import apiClient from './apiClient';

export const reviewApi = {
    getAll: (params) => apiClient.get('/reviews', { params }),
    delete: (id) => apiClient.delete(`/reviews/${id}`),
};
