import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({
    children,
    adminOnly = false,
    loginPath = '/admin/login',
    redirectPath = '/admin',
}) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to={loginPath} replace />;
    }

    if (adminOnly && !isAdmin()) {
        return <Navigate to={redirectPath} replace />;
    }

    return children;
};

export default ProtectedRoute;
