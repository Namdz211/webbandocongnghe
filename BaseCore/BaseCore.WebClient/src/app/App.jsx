import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React from 'react';
import { AuthProvider } from '../auth/AuthContext';
import ProtectedRoute from '../routes/ProtectedRoute';
import AdminLayout from '../layouts/AdminLayout';
import ShopApp from '../shop/ShopApp';
import Dashboard from '../pages/dashboard/Dashboard';
import Products from '../pages/products/Products';
import Users from '../pages/users/Users';
import Categories from '../pages/categories/Categories';
import Manufacturers from '../pages/manufacturers/Manufacturers';
import Orders from '../pages/orders/Orders';
import Customers from '../pages/customers/Customers';
import Reviews from '../pages/reviews/Reviews';
import Coupons from '../pages/coupons/Coupons';

function AppRoutes() {
    const location = useLocation();
    const isAdminArea = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

    if (!isAdminArea) {
        return <ShopApp />;
    }

    return (
        <Routes>
            <Route
                path="/admin/login"
                element={<Navigate to="/login?redirect=/admin" replace />}
            />
            <Route
                path="/admin"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <Dashboard />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/products"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <Products />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/categories"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <Categories />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/manufacturers"
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <Manufacturers />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/orders"
                element={
                    <ProtectedRoute adminOnly={true}>
                        <AdminLayout>
                            <Orders />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/customers"
                element={
                    <ProtectedRoute adminOnly={true}>
                        <AdminLayout>
                            <Customers />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/users"
                element={
                    <ProtectedRoute adminOnly={true}>
                        <AdminLayout>
                            <Users />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/reviews"
                element={
                    <ProtectedRoute adminOnly={true}>
                        <AdminLayout>
                            <Reviews />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/admin/coupons"
                element={
                    <ProtectedRoute adminOnly={true}>
                        <AdminLayout>
                            <Coupons />
                        </AdminLayout>
                    </ProtectedRoute>
                }
            />
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
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
