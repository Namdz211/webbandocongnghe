import axios from 'axios';

/**
 * Cấu hình Axios Client dùng chung cho toàn bộ ứng dụng
 * Tự động quản lý baseURL, định dạng dữ liệu truyền đi (JSON)
 */
const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Khóa lưu trữ thông tin xác thực dùng chung trong LocalStorage
const SHARED_AUTH_KEY = 'electro-store-auth';

// Danh sách các khóa lưu trữ thông tin xác thực cũ và mới để dọn dẹp khi đăng xuất
const AUTH_STORAGE_KEYS = [SHARED_AUTH_KEY, 'admin-token', 'admin-user', 'token', 'user'];

/**
 * Dọn dẹp toàn bộ dữ liệu xác thực lưu trữ ở trình duyệt khi phiên làm việc hết hạn hoặc đăng xuất
 */
function clearStoredAuth() {
    AUTH_STORAGE_KEYS.forEach((key) => {
        localStorage.removeItem(key);
    });
}

/**
 * Lấy Bearer Token hiện tại từ LocalStorage để đính kèm vào header của request
 * @returns {string} JWT Token hoặc chuỗi rỗng nếu chưa đăng nhập
 */
function getStoredToken() {
    try {
        const auth = JSON.parse(localStorage.getItem(SHARED_AUTH_KEY));
        return auth?.token || auth?.Token || '';
    } catch {
        return '';
    }
}

/**
 * Interceptor cho Request: Tự động đính kèm JWT Token vào Header của mọi request gửi đi
 */
apiClient.interceptors.request.use(
    (config) => {
        const token = getStoredToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

/**
 * Interceptor cho Response: Xử lý tập trung các lỗi HTTP toàn cục
 * Đặc biệt xử lý lỗi 401 Unauthorized bằng cách xóa dữ liệu đăng xuất và redirect về trang login
 */
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Xóa sạch phiên đăng nhập đã hết hạn
            clearStoredAuth();

            // Nếu người dùng không nằm sẵn ở trang login, thực hiện chuyển hướng yêu cầu đăng nhập lại
            if (window.location.pathname !== '/login') {
                window.location.replace('/login?redirect=/admin');
            }
        }
        return Promise.reject(error);
    },
);

export default apiClient;

