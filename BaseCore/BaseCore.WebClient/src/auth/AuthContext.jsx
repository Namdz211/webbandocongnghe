import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services';

const AuthContext = createContext(null);
const SHARED_AUTH_KEY = 'electro-store-auth';
const LEGACY_ADMIN_TOKEN_KEY = 'admin-token';
const LEGACY_ADMIN_USER_KEY = 'admin-user';
const LEGACY_TOKEN_KEY = 'token';
const LEGACY_USER_KEY = 'user';

function readJsonStorage(key) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

function isAdminUser(user) {
    return String(user?.role || user?.Role || '').toLowerCase() === 'admin';
}

function getAuthToken(user) {
    return user?.token || user?.Token || '';
}

function storeSharedAuth(user) {
    localStorage.setItem(SHARED_AUTH_KEY, JSON.stringify(user));
    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
    localStorage.removeItem(LEGACY_ADMIN_USER_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
}

function clearSharedAuth() {
    localStorage.removeItem(SHARED_AUTH_KEY);
    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
    localStorage.removeItem(LEGACY_ADMIN_USER_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
}

function getStoredAuth() {
    const legacyAdminUser = readJsonStorage(LEGACY_ADMIN_USER_KEY);
    const legacyAdminToken = localStorage.getItem(LEGACY_ADMIN_TOKEN_KEY);
    if (legacyAdminUser && legacyAdminToken && isAdminUser(legacyAdminUser)) {
        const migratedUser = { ...legacyAdminUser, token: legacyAdminToken };
        storeSharedAuth(migratedUser);
        return migratedUser;
    }

    const sharedAuth = readJsonStorage(SHARED_AUTH_KEY);
    if (sharedAuth && getAuthToken(sharedAuth)) {
        return sharedAuth;
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
        const syncStoredAuth = () => {
            setUser(getStoredAuth());
        };

        syncStoredAuth();
        setLoading(false);

        window.addEventListener('storage', syncStoredAuth);
        window.addEventListener('auth-changed', syncStoredAuth);

        return () => {
            window.removeEventListener('storage', syncStoredAuth);
            window.removeEventListener('auth-changed', syncStoredAuth);
        };
    }, []);

    const login = async (username, password) => {
        try {
            const response = await authApi.login(username, password);
            const userData = response.data;

            storeSharedAuth(userData);
            setUser(userData);

            return { success: true };
        } catch (error) {
            const message = error.response?.data?.message || 'Đăng nhập thất bại';
            return { success: false, message };
        }
    };

    const logout = () => {
        clearSharedAuth();
        setUser(null);
    };

    const isAdmin = () => {
        return isAdminUser(user);
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
