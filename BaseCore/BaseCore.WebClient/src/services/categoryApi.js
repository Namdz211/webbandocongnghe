import apiClient from './apiClient';

/**
 * API quản lý Danh mục sản phẩm (Categories)
 */
export const categoryApi = {
    // Lấy toàn bộ danh mục sản phẩm
    getAll: () => apiClient.get('/categories'),
    
    // Lấy chi tiết danh mục theo ID
    getById: (id) => apiClient.get(`/categories/${id}`),
    
    // Thêm mới danh mục sản phẩm (Yêu cầu Admin)
    create: (data) => apiClient.post('/categories', data),
    
    // Cập nhật thông tin danh mục (Yêu cầu Admin)
    update: (id, data) => apiClient.put(`/categories/${id}`, data),
    
    // Xóa danh mục sản phẩm (Yêu cầu Admin)
    delete: (id) => apiClient.delete(`/categories/${id}`),
};
