/**
 * Điểm xuất khẩu tập trung (Barrel Export) cho toàn bộ API Services
 * Giúp việc import các API trong toàn hệ thống trở nên ngắn gọn và đồng bộ hơn.
 */

export { default as apiClient } from './apiClient';
export { authApi } from './authApi';
export { userApi } from './userApi';
export { productApi } from './productApi';
export { categoryApi } from './categoryApi';
export { manufacturerApi } from './manufacturerApi';
export { orderApi } from './orderApi';
export { customerApi } from './customerApi';
export { statisticsApi } from './statisticsApi';
export { reviewApi } from './reviewApi';
export { couponApi } from './couponApi';


