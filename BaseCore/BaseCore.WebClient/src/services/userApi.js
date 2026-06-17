import apiClient from './apiClient';

/**
 * API quản lý Người dùng / Tài khoản quản trị (Users)
 * Cho phép Admin tối cao quản lý danh sách tài khoản nhân viên, phân quyền và trạng thái hoạt động
 */
export const userApi = {
    // Lấy danh sách toàn bộ người dùng hệ thống (hỗ trợ phân trang và tìm kiếm)
    getAll: (params) => apiClient.get('/users', { params }),
    
    // Lấy thông tin chi tiết của một tài khoản quản trị cụ thể
    getById: (id) => apiClient.get(`/users/${id}`),
    
    // Tạo tài khoản quản trị / nhân viên mới
    create: (data) => apiClient.post('/users', data),
    
    // Cập nhật thông tin tài khoản (Họ tên, mật khẩu, phân quyền role, trạng thái khóa tài khoản)
    update: (id, data) => apiClient.put(`/users/${id}`, data),
    
    // Xóa tài khoản nhân viên khỏi hệ thống
    delete: (id) => apiClient.delete(`/users/${id}`),
};

