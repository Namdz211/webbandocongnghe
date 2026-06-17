import apiClient from './apiClient';

/**
 * API quản lý Khách hàng dành riêng cho trang Admin
 * Hệ thống tự động loại trừ tài khoản khách vãng lai ảo (guest_checkout) ở Backend
 */
export const customerApi = {
    // Lấy danh sách toàn bộ khách hàng kèm phân hạng và doanh thu tích lũy
    getAll: (params) => apiClient.get('/customers', { params }),
    
    // Lấy thông tin chi tiết và lịch sử đơn hàng của một khách hàng cụ thể
    getById: (id) => apiClient.get(`/customers/${id}`),
};
