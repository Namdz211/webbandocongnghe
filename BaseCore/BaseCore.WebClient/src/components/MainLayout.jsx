import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminAssets from './AdminAssets';

const MainLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isAdmin } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <div className="wrapper">
            <AdminAssets />
            {/* Navbar */}
            <nav className="main-header navbar navbar-expand navbar-white navbar-light">
                <ul className="navbar-nav">
                    <li className="nav-item">
                        <a className="nav-link" data-widget="pushmenu" href="#" role="button">
                            <i className="fas fa-bars"></i>
                        </a>
                    </li>
                    <li className="nav-item d-none d-sm-inline-block">
                        <Link to="/" className="nav-link">Shop</Link>
                    </li>
                </ul>

                <ul className="navbar-nav ml-auto">
                    <li className="nav-item dropdown">
                        <a className="nav-link" data-toggle="dropdown" href="#">
                            <i className="far fa-user"></i> {user?.name || user?.username}
                        </a>
                        <div className="dropdown-menu dropdown-menu-right">
                            <span className="dropdown-item dropdown-header">
                                {user?.email}
                            </span>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item" onClick={handleLogout}>
                                <i className="fas fa-sign-out-alt mr-2"></i> Logout
                            </button>
                        </div>
                    </li>
                </ul>
            </nav>

            {/* Sidebar */}
            <aside className="main-sidebar sidebar-dark-primary elevation-4">
                <Link to="/admin" className="brand-link">
                    <span className="brand-text font-weight-light ml-3">
                        <b>Store</b> Sales
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
                        <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
                            <li className="nav-item">
                                <Link to="/admin" className={`nav-link ${isActive('/admin')}`}>
                                    <i className="nav-icon fas fa-tachometer-alt"></i>
                                    <p>Dashboard</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/admin/orders" className={`nav-link ${isActive('/admin/orders')}`}>
                                    <i className="nav-icon fas fa-shopping-cart"></i>
                                    <p>Orders</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/admin/products" className={`nav-link ${isActive('/admin/products')}`}>
                                    <i className="nav-icon fas fa-box"></i>
                                    <p>Products</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/admin/categories" className={`nav-link ${isActive('/admin/categories')}`}>
                                    <i className="nav-icon fas fa-tags"></i>
                                    <p>Categories</p>
                                </Link>
                            </li>
                            {isAdmin() && (
                                <li className="nav-item">
                                    <Link to="/admin/coupons" className={`nav-link ${isActive('/admin/coupons')}`}>
                                        <i className="nav-icon fas fa-ticket-alt"></i>
                                        <p>Coupons</p>
                                    </Link>
                                </li>
                            )}
                            {isAdmin() && (
                                <li className="nav-item">
                                    <Link to="/admin/users" className={`nav-link ${isActive('/admin/users')}`}>
                                        <i className="nav-icon fas fa-users"></i>
                                        <p>Users</p>
                                    </Link>
                                </li>
                            )}
                        </ul>
                    </nav>
                </div>
            </aside>

            {/* Content */}
            {children}

            {/* Footer */}
            <footer className="main-footer">
                <strong>Copyright &copy; 2024 <a href="#">BaseCore Sales</a>.</strong>
                <div className="float-right d-none d-sm-inline-block">
                    <b>Version</b> 1.0.0
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;
