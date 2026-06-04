import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import AdminAssets from '../components/AdminAssets';

const AdminLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isAdmin } = useAuth();
    const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

    useEffect(() => {
        setIsAccountMenuOpen(false);
        document.body.classList.remove('sidebar-open');
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleToggleSidebar = () => {
        const className = window.innerWidth <= 991.98 ? 'sidebar-open' : 'sidebar-collapse';
        document.body.classList.toggle(className);
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <div className="wrapper">
            <AdminAssets />
            <nav className="main-header navbar navbar-expand navbar-white navbar-light">
                <ul className="navbar-nav">
                    <li className="nav-item">
                        <button
                            type="button"
                            className="nav-link btn btn-link"
                            aria-label="Thu gọn thanh điều hướng"
                            onClick={handleToggleSidebar}
                        >
                            <i className="fas fa-bars"></i>
                        </button>
                    </li>
                    <li className="nav-item d-none d-sm-inline-block">
                        <Link to="/" className="nav-link">Trang chủ</Link>
                    </li>
                </ul>

                <ul className="navbar-nav ml-auto">
                    <li className="nav-item dropdown">
                        <button
                            type="button"
                            className="nav-link btn btn-link"
                            aria-expanded={isAccountMenuOpen}
                            onClick={() => setIsAccountMenuOpen((current) => !current)}
                        >
                            <i className="far fa-user"></i> {user?.name || user?.username}
                        </button>
                        <div className={`dropdown-menu dropdown-menu-right ${isAccountMenuOpen ? 'show' : ''}`}>
                            <span className="dropdown-item dropdown-header">
                                {user?.email}
                            </span>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item" onClick={handleLogout}>
                                <i className="fas fa-sign-out-alt mr-2"></i> Đăng xuất
                            </button>
                        </div>
                    </li>
                </ul>
            </nav>

            <aside className="main-sidebar sidebar-dark-primary elevation-4">
                <Link to="/admin" className="brand-link">
                    <span className="brand-text font-weight-light ml-3">
                        <b>Quản trị</b> bán hàng
                    </span>
                </Link>

                <div className="sidebar">
                    <div className="user-panel mt-3 pb-3 mb-3 d-flex">
                        <div className="image">
                            <i className="fas fa-user-circle fa-2x text-light"></i>
                        </div>
                        <div className="info">
                            <Link to="#" className="d-block">{user?.name || user?.username}</Link>
                        </div>
                    </div>

                    <nav className="mt-2">
                        <ul className="nav nav-pills nav-sidebar flex-column" role="menu">
                            <li className="nav-item">
                                <Link to="/admin" className={`nav-link ${isActive('/admin')}`}>
                                    <i className="nav-icon fas fa-tachometer-alt text-warning"></i>
                                    <p>Bảng điều khiển</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/admin/products" className={`nav-link ${isActive('/admin/products')}`}>
                                    <i className="nav-icon fas fa-box text-warning"></i>
                                    <p>Sản phẩm</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/admin/categories" className={`nav-link ${isActive('/admin/categories')}`}>
                                    <i className="nav-icon fas fa-tags text-warning"></i>
                                    <p>Danh mục</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/admin/manufacturers" className={`nav-link ${isActive('/admin/manufacturers')}`}>
                                    <i className="nav-icon fas fa-industry text-warning"></i>
                                    <p>Nhà sản xuất</p>
                                </Link>
                            </li>
                            {isAdmin() && (
                                <>
                                    <li className="nav-item">
                                        <Link to="/admin/orders" className={`nav-link ${isActive('/admin/orders')}`}>
                                            <i className="nav-icon fas fa-shopping-cart text-warning"></i>
                                            <p>Đơn hàng</p>
                                        </Link>
                                    </li>
                                    <li className="nav-item">
                                        <Link to="/admin/customers" className={`nav-link ${isActive('/admin/customers')}`}>
                                            <i className="nav-icon fas fa-address-book text-warning"></i>
                                            <p>Khách hàng</p>
                                        </Link>
                                    </li>
                                    <li className="nav-item">
                                        <Link to="/admin/users" className={`nav-link ${isActive('/admin/users')}`}>
                                            <i className="nav-icon fas fa-users text-warning"></i>
                                            <p>Người dùng</p>
                                        </Link>
                                    </li>
                                    <li className="nav-item">
                                        <Link to="/admin/reviews" className={`nav-link ${isActive('/admin/reviews')}`}>
                                            <i className="nav-icon fas fa-star text-warning"></i>
                                            <p>Đánh giá</p>
                                        </Link>
                                    </li>
                                    <li className="nav-item">
                                        <Link to="/admin/coupons" className={`nav-link ${isActive('/admin/coupons')}`}>
                                            <i className="nav-icon fas fa-ticket-alt text-warning"></i>
                                            <p>Mã giảm giá</p>
                                        </Link>
                                    </li>
                                    <li className="nav-item">
                                        <Link to="/login" className="nav-link" onClick={logout}>
                                            <i className="nav-icon fas fa-sign-out-alt text-warning"></i>
                                            <p>Đăng xuất</p>
                                        </Link>
                                    </li>
                                </>
                            )}
                        </ul>
                    </nav>
                </div>
            </aside>

            {children}

            <footer className="main-footer">
                <strong>Copyright &copy; 2024 <a href="#">BaseCore Sales</a>.</strong>
                <div className="float-right d-none d-sm-inline-block">
                    <b>Phiên bản</b> 1.0.0
                </div>
            </footer>
        </div>
    );
};

export default AdminLayout;
