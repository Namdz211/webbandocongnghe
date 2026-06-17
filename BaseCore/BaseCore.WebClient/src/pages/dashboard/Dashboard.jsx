import React, { useState, useEffect } from 'react';
import { productApi, userApi, categoryApi, statisticsApi, customerApi } from '../../services';
import { useAuth } from '../../auth/AuthContext';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

// anti-slop guidelines:
// - VISUAL_DENSITY: 8 - Bảng điều khiển admin tích hợp nhiều biểu đồ thống kê với mật độ dữ liệu cao.
// - SHAPE CONSISTENCY LOCK: Định dạng card bóng nhẹ và góc bo tròn 10px đồng bộ (borderRadius: '10px').
// - MOTION_INTENSITY: 4 - Sử dụng hiệu ứng chuyển động mượt mà cho biểu đồ PieChart (animationDuration={1500}).
const Dashboard = () => {
    const [stats, setStats] = useState({
        products: 0,
        categories: 0,
        customers: 0,
        users: 0,
    });

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const formatDateValue = (date) => {
        const d = new Date(date);
        const month = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        return [d.getFullYear(), month, day].join('-');
    };

    const [startDate, setStartDate] = useState(formatDateValue(firstDayOfMonth));
    const [endDate, setEndDate] = useState(formatDateValue(today));
    const [revenueData, setRevenueData] = useState({ totalRevenue: 0, orderCount: 0 });
    const [inventoryData, setInventoryData] = useState([]);
    const [topSellingProducts, setTopSellingProducts] = useState([]);
    const [statsError, setStatsError] = useState('');
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);

    const { isAdmin } = useAuth();

    useEffect(() => {
        loadStats();
        loadAdvancedStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadStats = async () => {
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                productApi.getAll(),
                categoryApi.getAll(),
            ]);

            let usersCount = 0;
            let customersCount = 0;

            if (isAdmin()) {
                try {
                    const usersRes = await userApi.getAll({ page: 1, pageSize: 1 });
                    usersCount = usersRes.data.totalCount || 0;
                } catch {
                    console.log('Cannot fetch users count');
                }

                try {
                    const customersRes = await customerApi.getAll();
                    customersCount = Array.isArray(customersRes.data) ? customersRes.data.length : 0;
                } catch {
                    console.log('Cannot fetch customers count');
                }
            }

            setStats({
                products: productsRes.data?.totalCount || productsRes.data?.items?.length || productsRes.data?.length || 0,
                categories: categoriesRes.data?.length || 0,
                customers: customersCount,
                users: usersCount,
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAdvancedStats = async () => {
        setStatsLoading(true);
        setStatsError('');

        try {
            const [revenueResult, inventoryResult, topSellingResult] = await Promise.allSettled([
                statisticsApi.getRevenue(startDate, endDate),
                statisticsApi.getInventoryByCategory(),
                statisticsApi.getTopSellingProducts({ startDate, endDate, top: 5 }),
            ]);

            if (revenueResult.status === 'fulfilled') {
                setRevenueData(revenueResult.value.data || { totalRevenue: 0, orderCount: 0 });
            } else {
                setRevenueData({ totalRevenue: 0, orderCount: 0 });
            }

            if (inventoryResult.status === 'fulfilled') {
                const mappedInventory = (inventoryResult.value.data || []).map(item => ({
                    name: item.categoryName,
                    value: item.quantityInStock,
                }));
                setInventoryData(mappedInventory);
            } else {
                setInventoryData([]);
            }

            if (topSellingResult.status === 'fulfilled') {
                setTopSellingProducts(topSellingResult.value.data || []);
            } else {
                setTopSellingProducts([]);
            }

            if (
                revenueResult.status === 'rejected' ||
                inventoryResult.status === 'rejected' ||
                topSellingResult.status === 'rejected'
            ) {
                setStatsError('Không tải được đầy đủ dữ liệu thống kê. Vui lòng kiểm tra API doanh thu/đơn hàng.');
            }
        } catch (error) {
            setStatsError('Không tải được dữ liệu thống kê.');
            setRevenueData({ totalRevenue: 0, orderCount: 0 });
            setInventoryData([]);
            setTopSellingProducts([]);
            console.error('Failed to load advanced stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const handleFilterRevenue = (e) => {
        e.preventDefault();
        loadAdvancedStats();
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
    };

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">Bảng điều khiển & Thống kê</h1>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {statsError && (
                        <div className="alert alert-warning">
                            {statsError}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="sr-only">Đang tải...</span>
                            </div>
                        </div>
                    ) : (
                        <div className="row">
                            <div className="col-lg-3 col-6">
                                <div className="small-box bg-info" style={{ transition: 'all 0.3s' }}>
                                    <div className="inner">
                                        <h3>{stats.products}</h3>
                                        <p>Sản phẩm</p>
                                    </div>
                                    <div className="icon">
                                        <i className="fas fa-box"></i>
                                    </div>
                                    <a href="/admin/products" className="small-box-footer">
                                        Xem chi tiết <i className="fas fa-arrow-circle-right"></i>
                                    </a>
                                </div>
                            </div>
                            <div className="col-lg-3 col-6">
                                <div className="small-box bg-success" style={{ transition: 'all 0.3s' }}>
                                    <div className="inner">
                                        <h3>{stats.categories}</h3>
                                        <p>Danh mục</p>
                                    </div>
                                    <div className="icon">
                                        <i className="fas fa-tags"></i>
                                    </div>
                                    <a href="/admin/categories" className="small-box-footer">
                                        Xem chi tiết <i className="fas fa-arrow-circle-right"></i>
                                    </a>
                                </div>
                            </div>
                            {isAdmin() && (
                                <div className="col-lg-3 col-6">
                                    <div className="small-box bg-danger" style={{ transition: 'all 0.3s' }}>
                                        <div className="inner">
                                            <h3>{stats.customers}</h3>
                                            <p>Khách hàng</p>
                                        </div>
                                        <div className="icon">
                                            <i className="fas fa-address-book"></i>
                                        </div>
                                        <a href="/admin/customers" className="small-box-footer">
                                            Xem chi tiết <i className="fas fa-arrow-circle-right"></i>
                                        </a>
                                    </div>
                                </div>
                            )}
                            {isAdmin() && (
                                <div className="col-lg-3 col-6">
                                    <div className="small-box bg-warning" style={{ transition: 'all 0.3s' }}>
                                        <div className="inner">
                                            <h3>{stats.users}</h3>
                                            <p>Người dùng</p>
                                        </div>
                                        <div className="icon">
                                            <i className="fas fa-users"></i>
                                        </div>
                                        <a href="/admin/users" className="small-box-footer">
                                            Xem chi tiết <i className="fas fa-arrow-circle-right"></i>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="row">
                        <div className="col-lg-6">
                            <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '10px' }}>
                                <div className="card-header bg-white border-0 pb-0">
                                    <h3 className="card-title font-weight-bold text-primary">
                                        <i className="fas fa-chart-line mr-2"></i> Báo cáo doanh thu
                                    </h3>
                                </div>
                                <div className="card-body">
                                    <form onSubmit={handleFilterRevenue} className="mb-4">
                                        <div className="row align-items-end">
                                            <div className="col-md-4">
                                                <div className="form-group mb-0">
                                                    <label className="text-muted small">Từ ngày</label>
                                                    <input
                                                        type="date"
                                                        className="form-control form-control-sm"
                                                        value={startDate}
                                                        onChange={(e) => setStartDate(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="form-group mb-0">
                                                    <label className="text-muted small">Đến ngày</label>
                                                    <input
                                                        type="date"
                                                        className="form-control form-control-sm"
                                                        value={endDate}
                                                        onChange={(e) => setEndDate(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <button type="submit" className="btn btn-primary btn-sm w-100" disabled={statsLoading}>
                                                    {statsLoading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-filter"></i> Lọc</>}
                                                </button>
                                            </div>
                                        </div>
                                    </form>

                                    {statsLoading ? (
                                        <div className="text-center py-4">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="sr-only">Đang tải...</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-light p-4 rounded mt-2 d-flex flex-column justify-content-center" style={{ transition: 'all 0.3s', borderLeft: '4px solid #007bff', minHeight: '160px' }}>
                                            <div className="mb-3">
                                                <h5 className="text-muted mb-1 font-weight-normal">Tổng doanh thu</h5>
                                                <h2 className="text-primary font-weight-bold mb-0">
                                                    {formatCurrency(revenueData.totalRevenue)}
                                                </h2>
                                            </div>
                                            <div className="mt-2">
                                                <h5 className="text-muted mb-1 font-weight-normal">Số lượng đơn hàng đã giao</h5>
                                                <h3 className="text-success font-weight-bold mb-0">
                                                    {revenueData.orderCount} đơn
                                                </h3>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-6">
                            <div className="card shadow-sm border-0 h-100" style={{ borderRadius: '10px' }}>
                                <div className="card-header bg-white border-0 pb-0">
                                    <h3 className="card-title font-weight-bold text-success">
                                        <i className="fas fa-pie-chart mr-2"></i> Tồn kho theo danh mục
                                    </h3>
                                </div>
                                <div className="card-body d-flex flex-column justify-content-center">
                                    {statsLoading ? (
                                        <div className="text-center py-5">
                                            <div className="spinner-border text-success" role="status">
                                                <span className="sr-only">Đang tải...</span>
                                            </div>
                                        </div>
                                    ) : inventoryData.length > 0 ? (
                                        <div style={{ height: 300, width: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={inventoryData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={100}
                                                        fill="#8884d8"
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        animationBegin={0}
                                                        animationDuration={1500}
                                                    >
                                                        {inventoryData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip formatter={(value) => [`${value} sản phẩm`, 'Tồn kho']} />
                                                    <Legend verticalAlign="bottom" height={36} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="text-center py-5 text-muted">
                                            Không có dữ liệu tồn kho.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row mt-4">
                        <div className="col-lg-12">
                            <div className="card shadow-sm border-0" style={{ borderRadius: '10px' }}>
                                <div className="card-header bg-white border-0 pb-0 d-flex justify-content-between align-items-center">
                                    <h3 className="card-title font-weight-bold text-danger">
                                        <i className="fas fa-fire mr-2"></i> Sản phẩm bán chạy
                                    </h3>
                                    <span className="text-muted small">Theo đơn hàng đã giao trong khoảng ngày đã chọn</span>
                                </div>
                                <div className="card-body">
                                    {statsLoading ? (
                                        <div className="text-center py-4">
                                            <div className="spinner-border text-danger" role="status">
                                                <span className="sr-only">Đang tải...</span>
                                            </div>
                                        </div>
                                    ) : topSellingProducts.length > 0 ? (
                                        <div className="table-responsive">
                                            <table className="table table-hover mb-0">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '60px' }}>#</th>
                                                        <th>Sản phẩm</th>
                                                        <th>Danh mục</th>
                                                        <th className="text-right">Đã bán</th>
                                                        <th className="text-right">Doanh thu</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {topSellingProducts.map((product, index) => (
                                                        <tr key={product.productId || product.ProductId}>
                                                            <td>
                                                                <span className="badge badge-danger">{index + 1}</span>
                                                            </td>
                                                            <td>
                                                                <div className="d-flex align-items-center">
                                                                    {(product.imageUrl || product.ImageUrl) && (
                                                                        <img
                                                                            alt={product.productName || product.ProductName}
                                                                            src={product.imageUrl || product.ImageUrl}
                                                                            style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 6, marginRight: 10 }}
                                                                        />
                                                                    )}
                                                                    <strong>{product.productName || product.ProductName}</strong>
                                                                </div>
                                                            </td>
                                                            <td>{product.categoryName || product.CategoryName || 'Không phân loại'}</td>
                                                            <td className="text-right font-weight-bold">
                                                                {product.soldQuantity ?? product.SoldQuantity ?? 0}
                                                            </td>
                                                            <td className="text-right text-success font-weight-bold">
                                                                {formatCurrency(product.revenue ?? product.Revenue ?? 0)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-muted">
                                            Chưa có sản phẩm bán chạy trong khoảng thời gian này.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
