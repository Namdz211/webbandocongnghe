import React, { useEffect, useMemo, useState } from 'react';
import { AlertMessage, LoadingState, PageHeader, StatBox } from '../../components/common';
import { customerApi } from '../../services';

const SEGMENT_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'VIP', label: 'VIP' },
    { value: 'Loyal', label: 'Thân thiết' },
    { value: 'Potential', label: 'Tiềm năng' },
    { value: 'New', label: 'Khách mới' },
    { value: 'NoOrders', label: 'Chưa mua' },
];

const SEGMENT_CONFIG = {
    VIP: { label: 'VIP', color: 'danger' },
    Loyal: { label: 'Thân thiết', color: 'success' },
    Potential: { label: 'Tiềm năng', color: 'info' },
    New: { label: 'Khách mới', color: 'warning' },
    NoOrders: { label: 'Chưa mua', color: 'secondary' },
};

// anti-slop guidelines:
// - VISUAL_DENSITY: 5 - Bảng quản lý khách hàng dạng tối ưu mật độ hiển thị (Cockpit layout), tinh gọn các trường cột.
// - SEGMENTATION DIAL: Phân hạng khách hàng tự động để cá nhân hóa chiến dịch chăm sóc (VIP, Loyal, Potential, New).
// - LOADING / ERROR STATES: Tích hợp đầy đủ thông báo lỗi và trạng thái tải dữ liệu chuẩn UX.
const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [segment, setSegment] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);

    const loadCustomers = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await customerApi.getAll({ keyword, segment });
            setCustomers(response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được danh sách khách hàng');
        } finally {
            setLoading(false);
        }
    };

    // Tải thông tin chi tiết của khách hàng cùng lịch sử đơn hàng của họ (Xử lý chặt chẽ Error States)
    const viewCustomer = async (customer) => {
        setError('');

        try {
            const response = await customerApi.getById(customer.userId);
            setSelectedCustomer(response.data.customer);
            setOrders(response.data.orders || []);
            setShowModal(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được chi tiết khách hàng');
        }
    };

    useEffect(() => {
        loadCustomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const totals = useMemo(() => {
        return customers.reduce(
            (result, customer) => ({
                spent: result.spent + Number(customer.totalSpent || 0),
                completed: result.completed + Number(customer.completedOrders || 0),
                vip: result.vip + (customer.segment === 'VIP' ? 1 : 0),
            }),
            { spent: 0, completed: 0, vip: 0 },
        );
    }, [customers]);

    return (
        <div className="content-wrapper">
            <PageHeader title="Quản lý khách hàng" activeLabel="Khách hàng" />
            {/*
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">Quản lý khách hàng</h1>
                        </div>
                        <div className="col-sm-6">
                            <ol className="breadcrumb float-sm-right">
                                <li className="breadcrumb-item"><a href="/">Trang chủ</a></li>
                                <li className="breadcrumb-item active">Khách hàng</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
            */}

            <section className="content">
                <div className="container-fluid">
                    <div className="row">
                        <StatBox color="info" icon="fas fa-users" label="Khách hàng" value={customers.length} />
                        <StatBox color="success" icon="fas fa-check-circle" label="Đơn hoàn thành" value={totals.completed} />
                        <StatBox color="danger" icon="fas fa-star" label="Khách VIP" value={totals.vip} />
                        <StatBox color="warning" icon="fas fa-coins" label="Doanh thu khách" value={formatCurrency(totals.spent)} />
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Tìm kiếm và phân loại</h3>
                        </div>
                        <div className="card-body">
                            <form onSubmit={(event) => { event.preventDefault(); loadCustomers(); }}>
                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="form-group">
                                            <label htmlFor="keyword">Tìm kiếm</label>
                                            <input
                                                id="keyword"
                                                className="form-control"
                                                placeholder="Tên, email, số điện thoại..."
                                                value={keyword}
                                                onChange={(event) => setKeyword(event.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="form-group">
                                            <label htmlFor="segment">Phân loại</label>
                                            <select
                                                id="segment"
                                                className="form-control"
                                                value={segment}
                                                onChange={(event) => setSegment(event.target.value)}
                                            >
                                                {SEGMENT_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="form-group">
                                            <label>&nbsp;</label>
                                            <button className="btn btn-primary btn-block" type="submit">
                                                <i className="fas fa-search mr-1"></i> Tìm kiếm
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <AlertMessage>{error}</AlertMessage>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Danh sách khách hàng</h3>
                        </div>
                        <div className="card-body">
                            {loading ? (
                                <LoadingState className="py-4" />
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped">
                                        <thead>
                                            <tr>
                                                <th>Khách hàng</th>
                                                <th>Liên hệ</th>
                                                <th>Tổng đơn</th>
                                                <th>Đã hoàn thành</th>
                                                <th>Tổng chi tiêu</th>
                                                <th>Lần mua gần nhất</th>
                                                <th>Phân loại</th>
                                                <th>Ưu đãi gợi ý</th>
                                                <th>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" className="text-center">Không tìm thấy khách hàng</td>
                                                </tr>
                                            ) : (
                                                customers.map((customer) => (
                                                    <tr key={customer.userId}>
                                                        <td>
                                                            <strong>{customer.name || customer.userName || 'Chưa rõ'}</strong>
                                                            <small className="d-block text-muted">{customer.userName}</small>
                                                        </td>
                                                        <td>
                                                            <span>{customer.email || '-'}</span>
                                                            <small className="d-block text-muted">{customer.phone || '-'}</small>
                                                        </td>
                                                        <td>{customer.totalOrders}</td>
                                                        <td>{customer.completedOrders}</td>
                                                        <td>{formatCurrency(customer.totalSpent)}</td>
                                                        <td>{formatDate(customer.lastOrderDate)}</td>
                                                        <td>{getSegmentBadge(customer.segment)}</td>
                                                        <td>{customer.suggestedOffer}</td>
                                                        <td>
                                                            <button className="btn btn-sm btn-info" type="button" onClick={() => viewCustomer(customer)}>
                                                                <i className="fas fa-eye"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {showModal && selectedCustomer && (
                <CustomerModal
                    customer={selectedCustomer}
                    orders={orders}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
};

// anti-slop guidelines:
// - MODAL LAYOUT: Sử dụng Modal kích thước lớn (modal-xl) kết hợp cấu trúc lưới thông tin 2 cột rõ ràng.
// - DATA DENSITY: Bảng danh sách đơn hàng lịch sử được làm gọn gàng, có nhãn trạng thái trực quan để tăng tốc độ xử lý của admin.
const CustomerModal = ({ customer, orders, onClose }) => (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-xl">
            <div className="modal-content">
                <div className="modal-header">
                    <h4 className="modal-title">Chi tiết khách hàng: {customer.name || customer.userName}</h4>
                    <button type="button" className="close" onClick={onClose}>
                        <span>&times;</span>
                    </button>
                </div>
                <div className="modal-body">
                    <div className="row mb-3">
                        <div className="col-md-6">
                            <table className="table table-sm">
                                <tbody>
                                    <tr><td><strong>Tên:</strong></td><td>{customer.name || 'Chưa có'}</td></tr>
                                    <tr><td><strong>Tài khoản:</strong></td><td>{customer.userName || 'Chưa có'}</td></tr>
                                    <tr><td><strong>Email:</strong></td><td>{customer.email || 'Chưa có'}</td></tr>
                                    <tr><td><strong>Số điện thoại:</strong></td><td>{customer.phone || 'Chưa có'}</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="col-md-6">
                            <table className="table table-sm">
                                <tbody>
                                    <tr><td><strong>Tổng đơn:</strong></td><td>{customer.totalOrders}</td></tr>
                                    <tr><td><strong>Đơn hoàn thành:</strong></td><td>{customer.completedOrders}</td></tr>
                                    <tr><td><strong>Tổng chi tiêu:</strong></td><td>{formatCurrency(customer.totalSpent)}</td></tr>
                                    <tr><td><strong>Phân loại:</strong></td><td>{getSegmentBadge(customer.segment)}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="alert alert-info">
                        <strong>Ưu đãi gợi ý:</strong> {customer.suggestedOffer}
                    </div>

                    <h5>Lịch sử mua hàng</h5>
                    <div className="table-responsive">
                        <table className="table table-bordered table-striped">
                            <thead>
                                <tr>
                                    <th>Đơn hàng</th>
                                    <th>Ngày đặt</th>
                                    <th>Tổng tiền</th>
                                    <th>Trạng thái</th>
                                    <th>Thanh toán</th>
                                    <th>Giao hàng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center">Khách hàng chưa có đơn hàng</td>
                                    </tr>
                                ) : (
                                    orders.map((order) => (
                                        <tr key={order.id}>
                                            <td>#{order.id}</td>
                                            <td>{formatDate(order.orderDate)}</td>
                                            <td>{formatCurrency(order.totalAmount)}</td>
                                            <td>{getStatusBadge(order.status)}</td>
                                            <td>{getPaymentBadge(order.paymentStatus)}</td>
                                            <td>{order.deliveryStatus || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Đóng</button>
                </div>
            </div>
        </div>
    </div>
);

const getSegmentBadge = (segment) => {
    const config = SEGMENT_CONFIG[segment] || { label: segment || 'Chưa có', color: 'secondary' };
    return <span className={`badge badge-${config.color}`}>{config.label}</span>;
};

const getStatusBadge = (status) => {
    const colors = {
        Pending: 'warning',
        Processing: 'info',
        Completed: 'success',
        Cancelled: 'danger',
    };
    const labels = {
        Pending: 'Chờ xử lý',
        Processing: 'Đang xử lý',
        Completed: 'Hoàn thành',
        Cancelled: 'Đã hủy',
    };
    return <span className={`badge badge-${colors[status] || 'secondary'}`}>{labels[status] || status || 'Chưa có'}</span>;
};

const getPaymentBadge = (status) => {
    const colors = {
        Paid: 'success',
        Pending: 'warning',
        PayAtCounter: 'info',
    };
    const labels = {
        Paid: 'Đã thanh toán',
        Pending: 'Chưa thanh toán',
        PayAtCounter: 'Thanh toán tại quầy',
    };
    return <span className={`badge badge-${colors[status] || 'secondary'}`}>{labels[status] || status || 'Chưa có'}</span>;
};

const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
}).format(Number(value || 0));

const formatDate = (dateString) => {
    if (!dateString) return '-';

    return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default Customers;
