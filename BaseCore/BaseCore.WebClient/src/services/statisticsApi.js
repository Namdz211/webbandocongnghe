import apiClient from './apiClient';

/**
 * API Báo cáo & Thống kê (Statistics)
 * Cung cấp dữ liệu trực quan cho Dashboard của Admin (Doanh thu, Kho hàng, Sản phẩm bán chạy)
 */
export const statisticsApi = {
    // Thống kê doanh thu cửa hàng theo khoảng thời gian chỉ định (startDate - endDate)
    getRevenue: (startDate, endDate) =>
        apiClient.get('/statistics/revenue', { params: { startDate, endDate } }),
        
    // Lấy thông tin tổng hợp về tồn kho (tổng số lượng sản phẩm, giá trị kho hàng)
    getInventory: () => apiClient.get('/statistics/inventory'),
    
    // Thống kê số lượng sản phẩm tồn kho phân nhóm theo từng danh mục
    getInventoryByCategory: () => apiClient.get('/statistics/inventory-by-category'),
    
    // Lấy danh sách các sản phẩm bán chạy nhất kèm số lượng đã bán (phục vụ biểu đồ xu hướng)
    getTopSellingProducts: (params = {}) =>
        apiClient.get('/statistics/top-selling-products', { params }),
};

