import apiClient from './apiClient';

/**
 * API liên quan đến quản lý Sản phẩm (Products)
 * Hỗ trợ các chức năng hiển thị sản phẩm ngoài cửa hàng và các thao tác CRUD dành cho Admin
 */
export const productApi = {
    // Lấy danh sách sản phẩm (hỗ trợ phân trang, lọc theo danh mục, nhà sản xuất, khoảng giá)
    getAll: (params) => apiClient.get('/products', { params }),
    
    // Tìm kiếm sản phẩm theo từ khóa và bộ lọc liên quan
    search: (params) => apiClient.get('/products', { params }),
    
    // Lấy thông tin chi tiết của một sản phẩm bằng ID (bao gồm thuộc tính và cấu hình kỹ thuật)
    getById: (id) => apiClient.get(`/products/${id}`),
    
    // Tạo sản phẩm mới (Chỉ dành cho Admin)
    create: (data) => apiClient.post('/products', data),
    
    // Cập nhật thông tin chi tiết sản phẩm (Chỉ dành cho Admin)
    update: (id, data) => apiClient.put(`/products/${id}`, data),
    
    // Xóa sản phẩm khỏi hệ thống (Chỉ dành cho Admin)
    delete: (id) => apiClient.delete(`/products/${id}`),
};

