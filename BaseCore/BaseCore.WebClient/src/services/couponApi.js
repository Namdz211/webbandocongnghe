import apiClient from './apiClient';

/**
 * API quản lý Mã giảm giá / Ưu đãi (Coupons)
 */
export const couponApi = {
    // Lấy danh sách mã giảm giá kèm bộ lọc (Yêu cầu Admin)
    getAll: (params) => apiClient.get('/coupons', { params }),
    
    // Lấy chi tiết mã giảm giá theo ID
    getById: (id) => apiClient.get(`/coupons/${id}`),
    
    // Kiểm tra tính hợp lệ và giá trị giảm của mã giảm giá khi thanh toán (luồng checkout)
    validate: (code, orderAmount) => apiClient.get(`/coupons/validate/${code}`, { params: { orderAmount } }),
    
    // Tạo mới mã giảm giá (Yêu cầu Admin)
    create: (data) => apiClient.post('/coupons', data),
    
    // Cập nhật mã giảm giá (Yêu cầu Admin)
    update: (id, data) => apiClient.put(`/coupons/${id}`, data),
    
    // Kích hoạt hoặc Vô hiệu hóa nhanh mã giảm giá (Yêu cầu Admin)
    toggle: (id) => apiClient.patch(`/coupons/${id}/toggle`),
    
    // Xóa mã giảm giá (Yêu cầu Admin)
    delete: (id) => apiClient.delete(`/coupons/${id}`),
};
