import apiClient from './apiClient';

export const authApi = {
    login: (username, password) => apiClient.post('/auth/login', { username, password }),
    register: (data) => apiClient.post('/auth/register', data),
};
