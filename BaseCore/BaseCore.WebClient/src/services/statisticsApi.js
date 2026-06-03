import apiClient from './apiClient';

export const statisticsApi = {
    getRevenue: (startDate, endDate) =>
        apiClient.get('/statistics/revenue', { params: { startDate, endDate } }),
    getInventory: () => apiClient.get('/statistics/inventory'),
    getInventoryByCategory: () => apiClient.get('/statistics/inventory-by-category'),
    getTopSellingProducts: (params = {}) =>
        apiClient.get('/statistics/top-selling-products', { params }),
};
