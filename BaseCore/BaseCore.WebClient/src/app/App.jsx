import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import ProtectedRoute from '../routes/ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';
import Login from '../pages/login/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import Products from '../pages/products/Products';
import Users from '../pages/users/Users';
import Categories from '../pages/categories/Categories';
import Manufacturers from '../pages/manufacturers/Manufacturers';
import Orders from '../pages/orders/Orders';
import Customers from '../pages/customers/Customers';
import Reviews from '../pages/reviews/Reviews';

// Wrapper to redirect authenticated users away from login
const PublicRoute = ({ children }) => {
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
        return <Navigate to="/" replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <Dashboard />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/products"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <Products />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/categories"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <Categories />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/manufacturers"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <Manufacturers />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/users"
                element={
                    <ProtectedRoute adminOnly={true}>
                        <AdminLayout>
                            <Users />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/orders"
                element={
                    <ProtectedRoute adminOnly={true}>
                        <AdminLayout>
                            <Orders />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/customers"
                element={
                    <ProtectedRoute adminOnly={true}>
                        <AdminLayout>
                            <Customers />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/reviews"
                element={
                    <ProtectedRoute adminOnly={true}>
                        <AdminLayout>
                            <Reviews />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
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
