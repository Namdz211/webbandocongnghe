import React, { useState, useEffect } from 'react';
import { orderApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Orders = () => {
    const { user } = useAuth();
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
    // New states for delivery management
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [assignData, setAssignData] = useState({ transportUnit: 'GHN', trackingCode: '' });
    const hasTransport = (order) =>
        Boolean(order?.transportUnit && order?.transportTrackingCode);
    const needsTransport = (order) => {
        const deliveryStatus = String(order?.deliveryStatus || '');
        return deliveryStatus && !deliveryStatus.startsWith('Ch') && !hasTransport(order);
    };
    const [deliveryData, setDeliveryData] = useState({ deliveryStatus: 'Chờ lấy hàng', deliveryDate: '' });

    // Load orders
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
            console.log('Orders API response:', response);
            console.log('Orders data:', response.data);
            setOrders(response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    // View order details
    const viewOrderDetails = async (orderId) => {
        try {
            const response = await orderApi.getById(orderId);
            console.log('Order details API response:', response);
            setSelectedOrder(response.data.order);
            setOrderDetails(response.data.details || []);
            setShowModal(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load order details');
        }
    };

    // Update order status
    const updateOrderStatus = async (orderId, newStatus) => {
        try {
            await orderApi.updateStatus(orderId, newStatus);
            await loadOrders();
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update order status');
        }
    };

    // Cancel order
    const cancelOrder = async (orderId) => {
        if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
            return;
        }
        
        try {
            await orderApi.cancel(orderId);
            await loadOrders();
            setShowModal(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to cancel order');
        }
    };

    // Assign transport
    const assignTransport = async (orderId) => {
        if (!assignData.transportUnit || !assignData.trackingCode.trim()) {
            setError('Vui lòng nhập đầy đủ thông tin vận chuyển');
            return;
        }
        try {
            const response = await orderApi.assignTransport(orderId, {
                transportUnit: assignData.transportUnit,
                trackingCode: assignData.trackingCode.trim()
            });
            await loadOrders();
            if (response.data?.order) {
                setSelectedOrder(response.data.order);
            }
            setShowAssignModal(false);
            setAssignData({ transportUnit: 'GHN', trackingCode: '' });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to assign transport');
        }
    };

    // Update delivery status
    const updateDeliveryStatus = async (orderId) => {
        try {
            const data = { deliveryStatus: deliveryData.deliveryStatus };
            if (deliveryData.deliveryDate) {
                data.deliveryDate = deliveryData.deliveryDate;
            }
            await orderApi.updateDelivery(orderId, data);
            await loadOrders();
            setShowDeliveryModal(false);
            setDeliveryData({ deliveryStatus: 'Chờ lấy hàng', deliveryDate: '' });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update delivery status');
        }
    };

    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0,
        }).format(Number(value || 0));
    };

    // Format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Vietnamese status labels and colors
    const getStatusBadge = (status) => {
        const statusConfig = {
            'Pending': { label: 'Chờ xử lý', color: 'warning' },
            'Processing': { label: 'Đang xử lý', color: 'info' },
            'Completed': { label: 'Hoàn thành', color: 'success' },
            'Cancelled': { label: 'Đã hủy', color: 'danger' }
        };
        const config = statusConfig[status] || { label: status, color: 'secondary' };
        return <span className={`badge badge-${config.color}`}>{config.label}</span>;
    };

    // Delivery status badge
    const getDeliveryBadge = (status) => {
        const colors = {
            'Chờ lấy hàng': 'secondary',
            'Đã giao đơn vị vận chuyển': 'info',
            'Đang giao': 'warning',
            'Đã giao thành công': 'success',
            'Giao thất bại': 'danger'
        };
        const color = colors[status] || 'dark';
        return <span className={`badge badge-${color}`}>{status || 'N/A'}</span>;
    };

    // Get payment badge
    const getPaymentBadge = (status) => {
        const colors = {
            'Paid': 'success',
            'Pending': 'warning',
            'PayAtCounter': 'info'
        };
        const labels = {
            'Paid': 'Đã thanh toán',
            'Pending': 'Chưa thanh toán',
            'PayAtCounter': 'Thanh toán tại quầy'
        };
        const color = colors[status] || 'secondary';
        const label = labels[status] || status;
        return <span className={`badge badge-${color}`}>{label}</span>;
    };

    // Transport units
    const transportUnits = [
        { value: 'GHTK', label: 'GHTK' },
        { value: 'GHN', label: 'GHN' },
        { value: 'Viettel Post', label: 'Viettel Post' },
        { value: 'J&T', label: 'J&T' },
        { value: '', label: 'Chọn đơn vị' }
    ];

    // Delivery statuses
    const deliveryStatuses = [
        { value: 'Chờ lấy hàng', label: 'Chờ lấy hàng' },
        { value: 'Đã giao đơn vị vận chuyển', label: 'Đã giao đơn vị vận chuyển' },
        { value: 'Đang giao', label: 'Đang giao' },
        { value: 'Đã giao thành công', label: 'Đã giao thành công' },
        { value: 'Giao thất bại', label: 'Giao thất bại' }
    ];

    useEffect(() => {
        loadOrders();
    }, []);

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">Quản lý Đơn hàng</h1>
                        </div>
                        <div className="col-sm-6">
                            <ol className="breadcrumb float-sm-right">
                                <li className="breadcrumb-item"><a href="/">Home</a></li>
                                <li className="breadcrumb-item active">Orders</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {/* Search and Filter */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Tìm kiếm và Lọc</h3>
                        </div>
                        <div className="card-body">
                            <form onSubmit={(e) => { e.preventDefault(); loadOrders(); }}>
                                <div className="row">
                                    <div className="col-md-3">
                                        <div className="form-group">
                                            <label htmlFor="keyword">Tìm kiếm</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                id="keyword"
                                                placeholder="Tìm theo ID, khách hàng..."
                                                value={keyword}
                                                onChange={(e) => setKeyword(e.target.value)}
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
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                            >
                                                <option value="">Tất cả</option>
                                                <option value="Pending">Chờ xử lý</option>
                                                <option value="Processing">Đang xử lý</option>
                                                <option value="Completed">Hoàn thành</option>
                                                <option value="Cancelled">Đã hủy</option>
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
                                                onChange={(e) => setFromDate(e.target.value)}
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
                                                onChange={(e) => setToDate(e.target.value)}
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

                    {/* Error Alert */}
                    {error && (
                        <div className="alert alert-danger alert-dismissible">
                            <button type="button" className="close" data-dismiss="alert">&times;</button>
                            <strong>Lỗi!</strong> {error}
                        </div>
                    )}

                    {/* Orders Table */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Danh sách Đơn hàng</h3>
                        </div>
                        <div className="card-body">
                            {loading ? (
                                <div className="text-center">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="sr-only">Loading...</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Khách hàng</th>
                                                <th>Ngày đặt</th>
                                                <th>Tổng tiền</th>
                                                <th>Trạng thái</th>
                                                <th>Thanh toán</th>
                                                <th>Vận chuyển</th>
                                                <th>Giao hàng</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.length === 0 ? (
                                                <tr>
                                                    <td colSpan="9" className="text-center">Không tìm thấy đơn hàng nào</td>
                                                </tr>
                                            ) : (
                                                orders.map((order) => (
                                                    <tr key={order.id}>
                                                        <td>#{order.id}</td>
                                                        <td>{order.user?.name || 'Unknown'}</td>
                                                        <td>{formatDate(order.orderDate)}</td>
                                                        <td>{formatCurrency(order.totalAmount)}</td>
                                                        <td>{getStatusBadge(order.status)}</td>
                                                        <td>{getPaymentBadge(order.paymentStatus)}</td>
                                                        <td>
                                                            {order.transportUnit || (needsTransport(order) ? (
                                                                <span className="badge badge-danger">Chưa bàn giao</span>
                                                            ) : '-')}
                                                        </td>
                                                        <td>{getDeliveryBadge(order.deliveryStatus)}</td>
                                                        <td>
                                                            <div className="btn-group">
                                                                <button
                                                                    className="btn btn-sm btn-info"
                                                                    onClick={() => viewOrderDetails(order.id)}
                                                                    title="Xem chi tiết"
                                                                >
                                                                    <i className="fas fa-eye"></i>
                                                                </button>
                                                                {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                                                                    <>
                                                                        <select
                                                                            className="btn btn-sm btn-warning ml-1"
                                                                            value={order.status}
                                                                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                                                        >
                                                                            <option value="Pending">Chờ xử lý</option>
                                                                            <option value="Processing">Đang xử lý</option>
                                                                        </select>
                                                                        <button
                                                                            className="btn btn-sm btn-success ml-1"
                                                                            onClick={() => {
                                                                                setSelectedOrder(order);
                                                                                setShowAssignModal(true);
                                                                            }}
                                                                            title="Giao vận chuyển"
                                                                        >
                                                                            <i className="fas fa-truck"></i>
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-sm btn-primary ml-1"
                                                                            onClick={() => {
                                                                                if (!hasTransport(order)) {
                                                                                    setError('Vui lòng giao đơn cho đơn vị vận chuyển trước khi cập nhật trạng thái giao hàng');
                                                                                    return;
                                                                                }
                                                                                setSelectedOrder(order);
                                                                                setShowDeliveryModal(true);
                                                                            }}
                                                                            title="Cập nhật giao hàng"
                                                                        >
                                                                            <i className="fas fa-shipping-fast"></i>
                                                                        </button>
                                                                        <button
                                                                            className="btn btn-sm btn-danger ml-1"
                                                                            onClick={() => cancelOrder(order.id)}
                                                                            title="Hủy đơn hàng"
                                                                        >
                                                                            <i className="fas fa-times"></i>
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {order.transportTrackingCode && (
                                                                    <a
                                                                        href={`https://ghn.vn/tracking?code=${order.transportTrackingCode}`}
                                                                        target="_blank"
                                                                        className="btn btn-sm btn-secondary ml-1"
                                                                        title="Tracking"
                                                                    >
                                                                        <i className="fas fa-map-marker-alt"></i>
                                                                    </a>
                                                                )}
                                                            </div>
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

            {/* Order Details Modal */}
            {showModal && selectedOrder && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h4 className="modal-title">Chi tiết Đơn hàng #{selectedOrder.id}</h4>
                                <button type="button" className="close" onClick={() => setShowModal(false)}>
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div className="modal-body">
                                {/* Order Information */}
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <h5>Thông tin đơn hàng</h5>
                                        <table className="table table-sm">
                                            <tr><td><strong>Ngày đặt:</strong></td><td>{formatDate(selectedOrder.orderDate)}</td></tr>
                                            <tr><td><strong>Tạm tính:</strong></td><td>{formatCurrency(selectedOrder.originalAmount || selectedOrder.totalAmount)}</td></tr>
                                            {(selectedOrder.discountAmount || 0) > 0 && (
                                                <>
                                                    <tr><td><strong>Ưu đãi:</strong></td><td>{selectedOrder.promotionName || `${selectedOrder.discountPercent}% discount`}</td></tr>
                                                    <tr><td><strong>Giảm giá:</strong></td><td>-{formatCurrency(selectedOrder.discountAmount)}</td></tr>
                                                </>
                                            )}
                                            <tr><td><strong>Tổng thanh toán:</strong></td><td>{formatCurrency(selectedOrder.totalAmount)}</td></tr>
                                            <tr><td><strong>Trạng thái:</strong></td><td>{getStatusBadge(selectedOrder.status)}</td></tr>
                                            <tr><td><strong>Phương thức:</strong></td><td>{selectedOrder.paymentMethodLabel || selectedOrder.paymentMethod}</td></tr>
                                            <tr><td><strong>Thanh toán:</strong></td><td>{getPaymentBadge(selectedOrder.paymentStatus)}</td></tr>
                                            {selectedOrder.paymentCode && <tr><td><strong>Mã thanh toán:</strong></td><td>{selectedOrder.paymentCode}</td></tr>}
                                        </table>
                                    </div>
                                    <div className="col-md-6">
                                        <h5>Thông tin giao hàng</h5>
                                        <table className="table table-sm">
                                            <tr><td><strong>Địa chỉ:</strong></td><td>{selectedOrder.shippingAddress || 'N/A'}</td></tr>
                                            {selectedOrder.transportUnit && <tr><td><strong>Vận chuyển:</strong></td><td>{selectedOrder.transportUnit}</td></tr>}
                                            {selectedOrder.transportTrackingCode && (
                                                <tr>
                                                    <td><strong>Mã vận đơn:</strong></td>
                                                    <td>
                                                        <a href={`https://ghn.vn/tracking?code=${selectedOrder.transportTrackingCode}`} target="_blank">
                                                            {selectedOrder.transportTrackingCode}
                                                        </a>
                                                    </td>
                                                </tr>
                                            )}
                                            <tr><td><strong>Trạng thái giao:</strong></td><td>{getDeliveryBadge(selectedOrder.deliveryStatus)}</td></tr>
                                            {selectedOrder.deliveryDate && <tr><td><strong>Ngày giao:</strong></td><td>{formatDate(selectedOrder.deliveryDate)}</td></tr>}
                                        </table>
                                        {selectedOrder.paymentNote && (
                                            <>
                                                <h5>Ghi chú thanh toán</h5>
                                                <p>{selectedOrder.paymentNote}</p>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Order Items */}
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
                                                        <strong>{detail.product?.name || 'Unknown Product'}</strong>
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

                                {/* Order Actions */}
                                {selectedOrder.status !== 'Completed' && selectedOrder.status !== 'Cancelled' && (
                                    <div className="row mt-3">
                                        <div className="col-md-3">
                                            <label>Trạng thái đơn:</label>
                                            <select
                                                className="form-control"
                                                value={selectedOrder.status}
                                                onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                                            >
                                                <option value="Pending">Chờ xử lý</option>
                                                <option value="Processing">Đang xử lý</option>
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <button className="btn btn-success mt-4" onClick={() => setShowAssignModal(true)}>
                                                Giao vận chuyển
                                            </button>
                                        </div>
                                        <div className="col-md-3">
                                            <button className="btn btn-primary mt-4" disabled={!hasTransport(selectedOrder)} onClick={() => setShowDeliveryModal(true)}>
                                                Cập nhật giao hàng
                                            </button>
                                        </div>
                                        <div className="col-md-3">
                                            <button
                                                className="btn btn-danger btn-block mt-4"
                                                onClick={() => cancelOrder(selectedOrder.id)}
                                            >
                                                Hủy đơn hàng
                                            </button>
                                        </div>
                                    </div>
                                )}
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

            {/* Assign Transport Modal */}
            {showAssignModal && selectedOrder && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h4 className="modal-title">Giao đơn #{selectedOrder.id} cho vận chuyển</h4>
                                <button className="close" onClick={() => setShowAssignModal(false)}>&times;</button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Đơn vị vận chuyển</label>
                                    <select className="form-control" value={assignData.transportUnit} onChange={(e) => setAssignData({...assignData, transportUnit: e.target.value})}>
                                        {transportUnits.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Mã vận đơn</label>
                                    <input type="text" className="form-control" value={assignData.trackingCode} onChange={(e) => setAssignData({...assignData, trackingCode: e.target.value})} placeholder="Nhập mã vận đơn" />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Hủy</button>
                                <button className="btn btn-primary" onClick={() => assignTransport(selectedOrder.id)}>Giao đơn vị vận chuyển</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Delivery Modal */}
            {showDeliveryModal && selectedOrder && (
                <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h4 className="modal-title">Cập nhật trạng thái giao hàng #{selectedOrder.id}</h4>
                                <button className="close" onClick={() => setShowDeliveryModal(false)}>&times;</button>
                            </div>
                            <div className="modal-body">
                                {!hasTransport(selectedOrder) && (
                                    <div className="alert alert-warning">
                                        Vui lòng giao đơn cho đơn vị vận chuyển và nhập mã vận đơn trước khi cập nhật trạng thái giao hàng.
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Trạng thái giao hàng</label>
                                    <select className="form-control" value={deliveryData.deliveryStatus} onChange={(e) => setDeliveryData({...deliveryData, deliveryStatus: e.target.value})}>
                                        {deliveryStatuses.map(stat => <option key={stat.value} value={stat.value}>{stat.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Ngày giao (tùy chọn)</label>
                                    <input type="date" className="form-control" value={deliveryData.deliveryDate} onChange={(e) => setDeliveryData({...deliveryData, deliveryDate: e.target.value})} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowDeliveryModal(false)}>Hủy</button>
                                <button className="btn btn-primary" disabled={!hasTransport(selectedOrder)} onClick={() => updateDeliveryStatus(selectedOrder.id)}>Cập nhật</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;
