import apiClient from './apiClient';

/**
 * API liên quan đến quản lý và xử lý Đơn hàng (Orders)
 * Đảm bảo các ràng buộc bảo mật (bắt buộc xác thực) và tính toàn vẹn dữ liệu
 */
export const orderApi = {
    // Tạo đơn hàng mới (Yêu cầu đăng nhập - bảo mật luồng checkout chống khách vãng lai ảo)
    create: (data) => apiClient.post('/orders', data),
    
    // Lấy danh sách lịch sử đơn hàng của chính tài khoản đang đăng nhập
    getMyOrders: () => apiClient.get('/orders'),
    
    // Lấy thông tin chi tiết một đơn hàng (Bảo mật: Admin hoặc chính chủ đơn hàng)
    getById: (id) => apiClient.get(`/orders/${id}`),
    
    // Lấy toàn bộ danh sách đơn hàng kèm bộ lọc tìm kiếm (Chỉ dành cho Admin)
    getAll: (params) => apiClient.get('/orders/all', { params }),
    
    // Cập nhật nhanh trạng thái đơn hàng (Chỉ dành cho Admin)
    updateStatus: (id, status) => apiClient.put(`/orders/${id}/status`, { status }),
    
    // Hủy đơn hàng đang chờ xác nhận (Admin hoặc chính chủ đơn hàng)
    cancel: (id) => apiClient.put(`/orders/${id}/cancel`),
    
    // Admin gán đơn vị vận chuyển và mã vận đơn cho đơn hàng
    assignTransport: (id, data) => apiClient.post(`/orders/${id}/assign-transport`, data),
    
    // Admin cập nhật chi tiết trạng thái giao hàng từ đối tác vận chuyển
    updateDelivery: (id, data) => apiClient.put(`/orders/${id}/update-delivery`, data),
};
