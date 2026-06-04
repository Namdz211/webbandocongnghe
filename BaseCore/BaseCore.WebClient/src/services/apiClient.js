import axios from 'axios';

const apiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

const SHARED_AUTH_KEY = 'electro-store-auth';
const AUTH_STORAGE_KEYS = [SHARED_AUTH_KEY, 'admin-token', 'admin-user', 'token', 'user'];

function clearStoredAuth() {
    AUTH_STORAGE_KEYS.forEach((key) => {
        localStorage.removeItem(key);
    });
}

function getStoredToken() {
    try {
        const auth = JSON.parse(localStorage.getItem(SHARED_AUTH_KEY));
        return auth?.token || auth?.Token || '';
    } catch {
        return '';
    }
}

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

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearStoredAuth();

            if (window.location.pathname !== '/login') {
                window.location.replace('/login?redirect=/admin');
            }
        }
        return Promise.reject(error);
    },
);

export default apiClient;
