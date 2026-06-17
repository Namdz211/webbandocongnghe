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

/**
 * Component quản lý toàn bộ hệ thống định tuyến (Routing) của ứng dụng.
 * Tự động phân chia luồng hiển thị giữa trang bán hàng (Storefront) và trang quản trị (Admin).
 */
function AppRoutes() {
    const location = useLocation();
    
    // Kiểm tra xem URL hiện tại có thuộc phân vùng quản trị Admin hay không
    const isAdminArea = location.pathname === '/admin' || location.pathname.startsWith('/admin/');

    // LUỒNG CỬA HÀNG (STOREFRONT): Nếu không phải khu vực quản trị, bàn giao định tuyến cho ShopApp
    if (!isAdminArea) {
        return <ShopApp />;
    }

    // LUỒNG QUẢN TRỊ (ADMIN AREA): Các trang Admin được cấu trúc bảo mật và bọc trong khung giao diện riêng
    return (
        <Routes>
            {/* Đăng nhập Admin: Chuyển hướng sang trang đăng nhập chung kèm tham số callback redirect */}
            <Route
                path="/admin/login"
                element={<Navigate to="/login?redirect=/admin" replace />}
            />
            
            {/* Trang Dashboard tổng quan: Yêu cầu đăng nhập, sử dụng layout Admin */}
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
            
            {/* Quản lý sản phẩm: Xem danh sách, thêm, sửa, xóa sản phẩm */}
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
            
            {/* Quản lý danh mục: Phân nhóm các dòng sản phẩm của cửa hàng */}
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
            
            {/* Quản lý nhà sản xuất: Các thương hiệu công nghệ đối tác */}
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
            
            {/* Quản lý đơn hàng: Xem danh sách đơn hàng, gán đơn vị vận chuyển (Chỉ dành cho Admin tối cao) */}
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
            
            {/* Quản lý khách hàng: Quản lý thành viên, xem doanh thu tích lũy (Chỉ dành cho Admin tối cao) */}
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
            
            {/* Quản lý tài khoản: Quản trị danh sách nhân viên hệ thống (Chỉ dành cho Admin tối cao) */}
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
            
            {/* Quản lý đánh giá: Kiểm duyệt/xóa các bình luận không phù hợp (Chỉ dành cho Admin tối cao) */}
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
            
            {/* Quản lý mã giảm giá: Thiết lập các chương trình ưu đãi (Chỉ dành cho Admin tối cao) */}
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
            
            {/* Xử lý fallback: Chuyển hướng các URL admin không hợp lệ về trang chủ Admin */}
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        </Routes>
    );
}

/**
 * Component gốc (Root Component) của ứng dụng Frontend.
 * Tích hợp hệ thống định tuyến (Router) và quản lý trạng thái xác thực toàn cục (AuthProvider).
 */
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

