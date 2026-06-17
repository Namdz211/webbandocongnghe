import apiClient from './apiClient';

/**
 * API quản lý Nhà sản xuất / Thương hiệu (Manufacturers)
 */
export const manufacturerApi = {
    // Lấy danh sách toàn bộ nhà sản xuất
    getAll: () => apiClient.get('/manufacturers'),
    
    // Lấy chi tiết nhà sản xuất theo ID
    getById: (id) => apiClient.get(`/manufacturers/${id}`),
    
    // Thêm nhà sản xuất mới (Yêu cầu Admin)
    create: (data) => apiClient.post('/manufacturers', data),
    
    // Cập nhật thông tin nhà sản xuất (Yêu cầu Admin)
    update: (id, data) => apiClient.put(`/manufacturers/${id}`, data),
    
    // Xóa nhà sản xuất (Yêu cầu Admin)
    delete: (id) => apiClient.delete(`/manufacturers/${id}`),
};
