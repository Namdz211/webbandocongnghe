import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services';

const AuthContext = createContext(null);
const SHOP_AUTH_KEY = 'electro-store-auth';

function readJsonStorage(key) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

function getStoredAuth() {
    const storedUser = readJsonStorage('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
        return storedUser;
    }

    const shopAuth = readJsonStorage(SHOP_AUTH_KEY);
    const shopToken = shopAuth?.token || shopAuth?.Token;

    if (shopAuth && shopToken) {
        localStorage.setItem('token', shopToken);
        localStorage.setItem('user', JSON.stringify(shopAuth));
        return shopAuth;
    }

    return null;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setUser(getStoredAuth());
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const response = await authApi.login(username, password);
            const userData = response.data;

            localStorage.setItem('token', userData.token);
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem(SHOP_AUTH_KEY, JSON.stringify(userData));
            setUser(userData);

            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Login failed';
            return { success: false, message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem(SHOP_AUTH_KEY);
        setUser(null);
    };

    const isAdmin = () => {
        return String(user?.role || user?.Role || '').toLowerCase() === 'admin';
    };

    const value = {
        user,
        login,
        logout,
        isAdmin,
        isAuthenticated: !!user,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
