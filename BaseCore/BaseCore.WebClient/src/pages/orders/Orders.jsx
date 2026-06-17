import React, { useEffect, useState } from 'react';
import { orderApi } from '../../services';

const statusOptions = [
    { value: 'Pending', label: 'Chờ xác nhận' },
    { value: 'Confirmed', label: 'Đã xác nhận' },
    { value: 'Shipping', label: 'Đang giao' },
    { value: 'Completed', label: 'Hoàn thành' },
    { value: 'Cancelled', label: 'Đã hủy' },
];

// anti-slop guidelines:
// - VISUAL_DENSITY: 6 - Thiết kế bảng danh sách đơn hàng cho admin với thông tin đầy đủ, rõ ràng và mạch lạc.
// - INTERACTIVE STATES: Trạng thái bận (busy) được kiểm soát chặt chẽ khi đang thực hiện cập nhật để tránh bấm lặp lại.
// - COPY SELF-AUDIT: Các nhãn trạng thái và phương thức thanh toán được chuẩn hóa rõ ràng.
const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDetails, setOrderDetails] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [actionOrderId, setActionOrderId] = useState(null);

    const loadOrders = async () => {
        setLoading(true);
        setError('');

        try {
            const params = {};
            if (keyword) params.keyword = keyword;
            if (statusFilter) params.status = statusFilter;
            if (fromDate) params.fromDate = fromDate;
            if (toDate) params.toDate = toDate;

            const response = await orderApi.getAll(params);
            setOrders(response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được danh sách đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    const viewOrderDetails = async (orderId) => {
        setError('');

        try {
            const response = await orderApi.getById(orderId);
            setSelectedOrder(response.data.order);
            setOrderDetails(response.data.details || []);
            setShowModal(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Không tải được chi tiết đơn hàng');
        }
    };

    // Cập nhật trạng thái đơn hàng (Khóa tương tác với 'busy = actionOrderId === order.id' để chống click trùng lặp)
    const updateOrderStatus = async (orderId, newStatus) => {
        setActionOrderId(orderId);
        setError('');

        try {
            await orderApi.updateStatus(orderId, newStatus);
            await loadOrders();

            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Cập nhật trạng thái đơn hàng thất bại');
        } finally {
            setActionOrderId(null);
        }
    };

    // Hủy đơn hàng (Yêu cầu xác nhận tường minh từ Admin trước khi tiến hành rollback kho hàng ở Backend)
    const cancelOrder = async (orderId) => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) {
            return;
        }

        setActionOrderId(orderId);
        setError('');

        try {
            await orderApi.cancel(orderId);
            await loadOrders();
            setShowModal(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Hủy đơn hàng thất bại');
        } finally {
            setActionOrderId(null);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(Number(value || 0));
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Chưa có';

        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (status) => {
        const config = {
            Pending: { label: 'Chờ xác nhận', color: 'warning' },
            Confirmed: { label: 'Đã xác nhận', color: 'info' },
            Shipping: { label: 'Đang giao', color: 'primary' },
            Completed: { label: 'Hoàn thành', color: 'success' },
            Cancelled: { label: 'Đã hủy', color: 'danger' },
        }[status] || { label: status || 'Chưa xác định', color: 'secondary' };

        return <span className={`badge badge-${config.color}`}>{config.label}</span>;
    };

    const getPaymentBadge = (status) => {
        const config = {
            Paid: { label: 'Đã thanh toán', color: 'success' },
            Pending: { label: 'Chưa thanh toán', color: 'warning' },
            Unpaid: { label: 'Chưa thanh toán', color: 'warning' },
            PayAtCounter: { label: 'Thanh toán tại quầy', color: 'info' },
        }[status] || { label: status || 'Chưa xác định', color: 'secondary' };

        return <span className={`badge badge-${config.color}`}>{config.label}</span>;
    };

    const getCustomerName = (order) => {
        const defaultName = (
            order.customerName ||
            order.CustomerName ||
            order.user?.name ||
            order.User?.Name ||
            order.customerUserName ||
            order.CustomerUserName ||
            'Chưa rõ'
        );

        // Nếu là khách vãng lai, thử bóc tách tên thật từ địa chỉ giao hàng
        if (defaultName === 'Khách vãng lai' && (order.shippingAddress || order.ShippingAddress)) {
            const address = order.shippingAddress || order.ShippingAddress;
            const match = address.match(/Người nhận:\s*([^|]+)/);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        return defaultName;
    };

    useEffect(() => {
        loadOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">Quản lý đơn hàng</h1>
                        </div>
                        <div className="col-sm-6 text-right">
                            <button className="btn btn-primary" type="button" onClick={loadOrders}>
                                <i className="fas fa-sync-alt mr-1"></i> Làm mới
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Tìm kiếm và lọc</h3>
                        </div>
                        <div className="card-body">
                            <form onSubmit={(event) => { event.preventDefault(); loadOrders(); }}>
                                <div className="row">
                                    <div className="col-md-3">
                                        <div className="form-group">
                                            <label htmlFor="keyword">Từ khóa</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                id="keyword"
                                                placeholder="Tìm theo mã đơn..."
                                                value={keyword}
                                                onChange={(event) => setKeyword(event.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-2">
                                        <div className="form-group">
                                            <label htmlFor="status">Trạng thái</label>
                                            <select
                                                className="form-control"
                                                id="status"
                                                value={statusFilter}
                                                onChange={(event) => setStatusFilter(event.target.value)}
                                            >
                                                <option value="">Tất cả</option>
                                                {statusOptions.map((status) => (
                                                    <option key={status.value} value={status.value}>{status.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-md-2">
                                        <div className="form-group">
                                            <label htmlFor="fromDate">Từ ngày</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                id="fromDate"
                                                value={fromDate}
                                                onChange={(event) => setFromDate(event.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-2">
                                        <div className="form-group">
                                            <label htmlFor="toDate">Đến ngày</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                id="toDate"
                                                value={toDate}
                                                onChange={(event) => setToDate(event.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="form-group">
                                            <label>&nbsp;</label>
                                            <button type="submit" className="btn btn-primary btn-block">
                                                <i className="fas fa-search"></i> Tìm kiếm
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger">
                            <strong>Lỗi!</strong> {error}
                        </div>
                    )}

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Danh sách đơn hàng</h3>
                        </div>
                        <div className="card-body p-0">
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="sr-only">Đang tải...</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped mb-0">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Khách hàng</th>
                                                <th>Ngày đặt</th>
                                                <th>Tổng tiền</th>
                                                <th>Thanh toán</th>
                                                <th>Trạng thái</th>
                                                <th>Địa chỉ</th>
                                                <th style={{ width: '190px' }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="text-center">
                                                        Không tìm thấy đơn hàng
                                                    </td>
                                                </tr>
                                            ) : (
                                                orders.map((order) => {
                                                    const busy = actionOrderId === order.id;
                                                    const canConfirm = order.status === 'Pending';
                                                    const canShip = order.status === 'Confirmed';
                                                    const canCancel = order.status === 'Pending';

                                                    return (
                                                        <tr key={order.id}>
                                                            <td>#{order.id}</td>
                                                            <td>{getCustomerName(order)}</td>
                                                            <td>{formatDate(order.orderDate)}</td>
                                                            <td>{formatCurrency(order.totalAmount)}</td>
                                                            <td>{getPaymentBadge(order.paymentStatus)}</td>
                                                            <td>{getStatusBadge(order.status)}</td>
                                                            <td>{order.shippingAddress || 'Chưa có'}</td>
                                                            <td>
                                                                <button
                                                                    className="btn btn-sm btn-info mr-1"
                                                                    type="button"
                                                                    onClick={() => viewOrderDetails(order.id)}
                                                                    title="Xem chi tiết"
                                                                >
                                                                    <i className="fas fa-eye"></i>
                                                                </button>
                                                                {canConfirm && (
                                                                    <button
                                                                        className="btn btn-sm btn-success mr-1"
                                                                        type="button"
                                                                        disabled={busy}
                                                                        onClick={() => updateOrderStatus(order.id, 'Confirmed')}
                                                                    >
                                                                        Xác nhận
                                                                    </button>
                                                                )}
                                                                {canShip && (
                                                                    <button
                                                                        className="btn btn-sm btn-primary mr-1"
                                                                        type="button"
                                                                        disabled={busy}
                                                                        onClick={() => updateOrderStatus(order.id, 'Shipping')}
                                                                    >
                                                                        Giao hàng
                                                                    </button>
                                                                )}
                                                                {canCancel && (
                                                                    <button
                                                                        className="btn btn-sm btn-danger"
                                                                        type="button"
                                                                        disabled={busy}
                                                                        onClick={() => cancelOrder(order.id)}
                                                                    >
                                                                        Hủy
                                                                    </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="card-footer text-muted">
                            Tổng: <strong>{orders.length}</strong> đơn hàng
                        </div>
                    </div>
                </div>
            </section>

            {showModal && selectedOrder && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h4 className="modal-title">Chi tiết đơn hàng #{selectedOrder.id}</h4>
                                <button type="button" className="close" onClick={() => setShowModal(false)}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <h5>Thông tin đơn hàng</h5>
                                        <table className="table table-sm">
                                            <tbody>
                                                <tr><td><strong>Ngày đặt:</strong></td><td>{formatDate(selectedOrder.orderDate)}</td></tr>
                                                <tr><td><strong>Tạm tính:</strong></td><td>{formatCurrency(selectedOrder.originalAmount || selectedOrder.totalAmount)}</td></tr>
                                                {(selectedOrder.discountAmount || 0) > 0 && (
                                                    <>
                                                        <tr><td><strong>Ưu đãi:</strong></td><td>{selectedOrder.promotionName || `Giảm ${selectedOrder.discountPercent}%`}</td></tr>
                                                        <tr><td><strong>Giảm giá:</strong></td><td>-{formatCurrency(selectedOrder.discountAmount)}</td></tr>
                                                    </>
                                                )}
                                                <tr><td><strong>Tổng thanh toán:</strong></td><td>{formatCurrency(selectedOrder.totalAmount)}</td></tr>
                                                <tr><td><strong>Trạng thái:</strong></td><td>{getStatusBadge(selectedOrder.status)}</td></tr>
                                                <tr><td><strong>Phương thức:</strong></td><td>{selectedOrder.paymentMethodLabel || selectedOrder.paymentMethod || 'Chưa có'}</td></tr>
                                                <tr><td><strong>Thanh toán:</strong></td><td>{getPaymentBadge(selectedOrder.paymentStatus)}</td></tr>
                                                {selectedOrder.paymentCode && <tr><td><strong>Mã thanh toán:</strong></td><td>{selectedOrder.paymentCode}</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="col-md-6">
                                        <h5>Thông tin giao hàng</h5>
                                        <table className="table table-sm">
                                            <tbody>
                                                <tr><td><strong>Khách hàng:</strong></td><td>{getCustomerName(selectedOrder)}</td></tr>
                                                <tr><td><strong>Email:</strong></td><td>{selectedOrder.customerEmail || 'Chưa có'}</td></tr>
                                                <tr><td><strong>Số điện thoại:</strong></td><td>{selectedOrder.customerPhone || 'Chưa có'}</td></tr>
                                                <tr><td><strong>Địa chỉ:</strong></td><td>{selectedOrder.shippingAddress || 'Chưa có'}</td></tr>
                                                {selectedOrder.transportUnit && <tr><td><strong>Vận chuyển:</strong></td><td>{selectedOrder.transportUnit}</td></tr>}
                                                {selectedOrder.transportTrackingCode && <tr><td><strong>Mã vận đơn:</strong></td><td>{selectedOrder.transportTrackingCode}</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <h5>Sản phẩm trong đơn hàng</h5>
                                <div className="table-responsive">
                                    <table className="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Sản phẩm</th>
                                                <th>Số lượng</th>
                                                <th>Đơn giá</th>
                                                <th>Thành tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orderDetails.map((detail) => (
                                                <tr key={detail.id}>
                                                    <td>
                                                        <strong>{detail.product?.name || 'Sản phẩm chưa rõ'}</strong>
                                                        {detail.product?.description && (
                                                            <small className="text-muted d-block">{detail.product.description}</small>
                                                        )}
                                                    </td>
                                                    <td>{detail.quantity}</td>
                                                    <td>{formatCurrency(detail.unitPrice)}</td>
                                                    <td>{formatCurrency(detail.quantity * detail.unitPrice)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;
