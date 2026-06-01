import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

const AUTH_STORAGE_KEYS = ['token', 'user', 'electro-store-auth'];

function clearStoredAuth() {
    AUTH_STORAGE_KEYS.forEach((key) => {
        localStorage.removeItem(key);
    });
}

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearStoredAuth();

            if (window.location.pathname !== '/admin/login') {
                window.location.replace('/admin/login');
            }
        }
        return Promise.reject(error);
    },
);

export default apiClient;
