import React, { useEffect, useState } from 'react';
import { orderApi } from '../services/api';

const ORDER_REFRESH_INTERVAL_MS = 5000;

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

const formatDate = (value) => {
    if (!value) return 'N/A';

    try {
        return new Intl.DateTimeFormat('vi-VN', {
            dateStyle: 'short',
            timeStyle: 'short',
        }).format(new Date(value));
    } catch {
        return value;
    }
};

const getOrderId = (order) => order.id || order.Id;
const getOrderStatus = (order) => String(order.status || order.Status || '').toLowerCase();

const getCustomerLabel = (order) => {
    const name =
        order.customerName ||
        order.CustomerName ||
        order.customerUserName ||
        order.CustomerUserName ||
        order.userId ||
        order.UserId ||
        'Customer';
    const contact =
        order.customerEmail ||
        order.CustomerEmail ||
        order.customerPhone ||
        order.CustomerPhone ||
        '';

    return contact ? `${name} (${contact})` : name;
};

const getStatusLabel = (order) => {
    if (order.statusLabel || order.StatusLabel) {
        return order.statusLabel || order.StatusLabel;
    }

    switch (getOrderStatus(order)) {
        case 'pending':
            return 'Cho xac nhan';
        case 'confirmed':
            return 'Da xac nhan';
        case 'shipping':
            return 'Dang giao';
        case 'completed':
            return 'Hoan thanh';
        case 'cancelled':
            return 'Da huy';
        default:
            return 'Chua xac dinh';
    }
};

const getStatusBadge = (order) => {
    switch (getOrderStatus(order)) {
        case 'pending':
            return 'badge-warning';
        case 'confirmed':
            return 'badge-info';
        case 'shipping':
            return 'badge-primary';
        case 'completed':
            return 'badge-success';
        case 'cancelled':
            return 'badge-danger';
        default:
            return 'badge-secondary';
    }
};

const normalizeOrders = (data) => {
    if (Array.isArray(data)) return data;
    return data?.items || data?.data || [];
};

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionOrderId, setActionOrderId] = useState(null);

    const loadOrders = async ({ showLoading = true } = {}) => {
        if (showLoading) setLoading(true);
        setError('');

        try {
            const response = await orderApi.getAllForAdmin();
            setOrders(normalizeOrders(response.data));
        } catch (err) {
            setError(err.response?.data?.message || 'Cannot load orders');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        const refreshTimer = window.setInterval(
            () => loadOrders({ showLoading: false }),
            ORDER_REFRESH_INTERVAL_MS,
        );

        return () => window.clearInterval(refreshTimer);
    }, []);

    const runAction = async (order, action) => {
        const orderId = getOrderId(order);
        setActionOrderId(orderId);
        setError('');

        try {
            if (action === 'confirm') {
                await orderApi.confirm(orderId);
            } else {
                await orderApi.ship(orderId);
            }

            await loadOrders({ showLoading: false });
        } catch (err) {
            setError(err.response?.data?.message || 'Order action failed');
        } finally {
            setActionOrderId(null);
        }
    };

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">Orders Management</h1>
                        </div>
                        <div className="col-sm-6 text-right">
                            <button className="btn btn-primary" type="button" onClick={() => loadOrders()}>
                                <i className="fas fa-sync-alt mr-1"></i> Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">All Orders</h3>
                        </div>
                        <div className="card-body p-0">
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary"></div>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-striped mb-0">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Customer</th>
                                                <th>Date</th>
                                                <th>Total</th>
                                                <th>Payment</th>
                                                <th>Status</th>
                                                <th>Address</th>
                                                <th style={{ width: '170px' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="text-center">
                                                        No orders found
                                                    </td>
                                                </tr>
                                            ) : (
                                                orders.map((order) => {
                                                    const orderId = getOrderId(order);
                                                    const status = getOrderStatus(order);
                                                    const busy = actionOrderId === orderId;
                                                    const canConfirm = status === 'pending';
                                                    const canShip = status === 'confirmed';

                                                    return (
                                                        <tr key={orderId}>
                                                            <td>#{orderId}</td>
                                                            <td>{getCustomerLabel(order)}</td>
                                                            <td>{formatDate(order.orderDate || order.OrderDate)}</td>
                                                            <td>{formatCurrency(order.totalAmount || order.TotalAmount)}</td>
                                                            <td>
                                                                {order.paymentMethodLabel ||
                                                                    order.PaymentMethodLabel ||
                                                                    order.paymentMethod ||
                                                                    order.PaymentMethod ||
                                                                    'N/A'}
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${getStatusBadge(order)}`}>
                                                                    {getStatusLabel(order)}
                                                                </span>
                                                            </td>
                                                            <td>{order.shippingAddress || order.ShippingAddress || 'N/A'}</td>
                                                            <td>
                                                                {canConfirm && (
                                                                    <button
                                                                        className="btn btn-sm btn-success mr-1"
                                                                        type="button"
                                                                        disabled={busy}
                                                                        onClick={() => runAction(order, 'confirm')}
                                                                    >
                                                                        <i className="fas fa-check mr-1"></i> Confirm
                                                                    </button>
                                                                )}
                                                                {canShip && (
                                                                    <button
                                                                        className="btn btn-sm btn-info"
                                                                        type="button"
                                                                        disabled={busy}
                                                                        onClick={() => runAction(order, 'ship')}
                                                                    >
                                                                        <i className="fas fa-truck mr-1"></i> Ship
                                                                    </button>
                                                                )}
                                                                {!canConfirm && !canShip && (
                                                                    <span className="text-muted">No action</span>
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
                            Total: <strong>{orders.length}</strong> orders
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Orders;
