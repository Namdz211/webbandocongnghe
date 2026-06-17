import apiClient from './apiClient';

/**
 * API quản lý Đánh giá sản phẩm (Reviews)
 * Cho phép khách hàng gửi phản hồi và Admin kiểm duyệt, quản lý các đánh giá trên hệ thống
 */
export const reviewApi = {
    // Lấy danh sách toàn bộ đánh giá kèm lọc theo sản phẩm hoặc mức độ đánh giá (sao)
    getAll: (params) => apiClient.get('/reviews', { params }),
    
    // Xóa đánh giá không phù hợp hoặc vi phạm chính sách cửa hàng (Chỉ dành cho Admin)
    delete: (id) => apiClient.delete(`/reviews/${id}`),
};

