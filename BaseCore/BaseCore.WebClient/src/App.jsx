import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import ShopApp from './shop/ShopApp';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Users from './pages/Users';
import Categories from './pages/Categories';
import Coupons from './pages/Coupons';
import Orders from './pages/Orders';

// Wrapper to redirect authenticated users away from login
const PublicRoute = ({ children, redirectTo = '/admin' }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/admin/login"
                element={
                    <PublicRoute redirectTo="/admin">
                        <Login />
                    </PublicRoute>
                }
            />
            <Route
                path="/admin"
                element={
                    <ProtectedRoute loginPath="/admin/login">
                        <MainLayout>
                            <Dashboard />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/orders"
                element={
                    <ProtectedRoute adminOnly={true} loginPath="/admin/login" redirectPath="/admin">
                        <MainLayout>
                            <Orders />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/products"
                element={
                    <ProtectedRoute loginPath="/admin/login">
                        <MainLayout>
                            <Products />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/categories"
                element={
                    <ProtectedRoute loginPath="/admin/login">
                        <MainLayout>
                            <Categories />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/users"
                element={
                    <ProtectedRoute adminOnly={true} loginPath="/admin/login" redirectPath="/admin">
                        <MainLayout>
                            <Users />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/coupons"
                element={
                    <ProtectedRoute adminOnly={true} loginPath="/admin/login" redirectPath="/admin">
                        <MainLayout>
                            <Coupons />
                        </MainLayout>
                    </ProtectedRoute>
                }
            />
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
            <Route path="/*" element={<ShopApp />} />
        </Routes>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;
