import apiClient from './apiClient';

/**
 * API liên quan đến Xác thực (Authentication)
 * Quản lý phiên đăng nhập và tạo tài khoản thành viên mới
 */
export const authApi = {
    // Đăng nhập hệ thống (Lấy JWT Token xác thực)
    login: (username, password) => apiClient.post('/auth/login', { username, password }),
    
    // Đăng ký tài khoản thành viên mới
    register: (data) => apiClient.post('/auth/register', data),
};
