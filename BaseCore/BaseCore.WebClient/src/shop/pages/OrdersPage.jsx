import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { ORDER_REFRESH_INTERVAL_MS, ORDER_STATUS_TABS } from '../constants/orders.js'
import LinkButton from '../components/LinkButton.jsx'
import { formatCurrency, formatDate } from '../utils/formatters.js'
import { getProductImage } from '../utils/productImages.js'
import { getAuthToken } from '../utils/auth.js'
import { toOrderStatusLabel } from '../utils/orders.js'

export default function OrdersPage({ auth, onNavigate, onNotify, onExportInvoice, onOrdersChanged }) {
  const [loading, setLoading] = useState(Boolean(auth))
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('all')
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const authToken = getAuthToken(auth)

  const fetchOrdersWithDetails = useCallback(async () => {
    const response = await api.getOrders(authToken)
    const orderList = Array.isArray(response) ? response : []
    const detailResults = await Promise.allSettled(
      orderList.map((order) => api.getOrder(order.id, authToken)),
    )

    return orderList.map((order, index) => {
      const result = detailResults[index]

      if (result.status !== 'fulfilled') {
        return { ...order, details: [] }
      }

      return {
        ...order,
        ...(result.value?.order || {}),
        details: Array.isArray(result.value?.details) ? result.value.details : [],
      }
    })
  }, [authToken])

  useEffect(() => {
    if (!authToken) {
      setOrders([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadOrders({ showLoading = true } = {}) {
      if (showLoading) {
        setLoading(true)
      }
      setError('')

      try {
        const response = await fetchOrdersWithDetails()

        if (!cancelled) {
          setOrders(response)
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message)
        }
      } finally {
        if (!cancelled && showLoading) {
          setLoading(false)
        }
      }
    }

    loadOrders()
    const refreshInterval = window.setInterval(
      () => loadOrders({ showLoading: false }),
      ORDER_REFRESH_INTERVAL_MS,
    )

    return () => {
      cancelled = true
      window.clearInterval(refreshInterval)
    }
  }, [authToken, fetchOrdersWithDetails])

  async function confirmReceived(orderId) {
    if (!authToken) {
      onNavigate('/login?redirect=/orders')
      return
    }

    setUpdatingOrderId(orderId)
    setError('')

    try {
      const response = await api.confirmOrderReceived(orderId, authToken)
      const refreshedOrders = await fetchOrdersWithDetails()
      setOrders(refreshedOrders)
      onOrdersChanged?.()
      onNotify?.('success', response?.message || '\u0110\u00e3 x\u00e1c nh\u1eadn nh\u1eadn h\u00e0ng.')
    } catch (requestError) {
      setError(requestError.message)
      onNotify?.('error', requestError.message)
    } finally {
      setUpdatingOrderId(null)
    }
  }

  async function cancelOrder(orderId) {
    if (!authToken) {
      onNavigate('/login?redirect=/orders')
      return
    }

    const confirmed = window.confirm(
      'B\u1ea1n c\u00f3 ch\u1eafc mu\u1ed1n h\u1ee7y \u0111\u01a1n h\u00e0ng n\u00e0y kh\u00f4ng?',
    )

    if (!confirmed) {
      return
    }

    setUpdatingOrderId(orderId)
    setError('')

    try {
      const response = await api.cancelOrder(orderId, authToken)
      const refreshedOrders = await fetchOrdersWithDetails()
      setOrders(refreshedOrders)
      onOrdersChanged?.()
      onNotify?.('success', response?.message || '\u0110\u00e3 h\u1ee7y \u0111\u01a1n h\u00e0ng.')
    } catch (requestError) {
      setError(requestError.message)
      onNotify?.('error', requestError.message)
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const filteredOrders = selectedOrderStatus === 'all'
    ? orders
    : orders.filter((order) => (order.status || '').toLowerCase() === selectedOrderStatus)

  const countOrdersByStatus = (status) => {
    if (status === 'all') {
      return orders.length
    }

    return orders.filter((order) => (order.status || '').toLowerCase() === status).length
  }

  return (

    <>
      <div id="breadcrumb" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h3 className="breadcrumb-header">{'\u0110\u01a1n h\u00e0ng c\u1ee7a t\u00f4i'}</h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    {'Trang ch\u1ee7'}
                  </LinkButton>
                </li>
                <li className="active">{'\u0110\u01a1n h\u00e0ng'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          {!auth ? (
            <div className="empty-state">
              {'B\u1ea1n ch\u01b0a \u0111\u0103ng nh\u1eadp n\u00ean ch\u01b0a th\u1ec3 xem danh s\u00e1ch \u0111\u01a1n h\u00e0ng.'}
              <div className="empty-actions">
                <LinkButton to="/login?redirect=/orders" className="primary-btn" onNavigate={onNavigate}>
                  {'\u0110\u0103ng nh\u1eadp'}
                </LinkButton>
              </div>
            </div>
          ) : loading ? (
            <div className="empty-state">{'\u0110ang t\u1ea3i l\u1ecbch s\u1eed \u0111\u01a1n h\u00e0ng...'}</div>

          ) : error ? (
            <div className="empty-state error-state">{error}</div>
          ) : orders.length === 0 ? (
            <div className="empty-state">{'T\u00e0i kho\u1ea3n n\u00e0y ch\u01b0a c\u00f3 \u0111\u01a1n h\u00e0ng n\u00e0o.'}</div>
          ) : (
            <>
              <div className="order-tabs" role="tablist" aria-label="Lọc đơn hàng">
                {ORDER_STATUS_TABS.map((tab) => (
                  <button
                    className={selectedOrderStatus === tab.id ? 'active' : ''}
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedOrderStatus(tab.id)}
                  >
                    <span>{tab.label}</span>
                    <small>{countOrdersByStatus(tab.id)}</small>
                  </button>
                ))}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="empty-state compact">{'Kh\u00f4ng c\u00f3 \u0111\u01a1n h\u00e0ng trong tr\u1ea1ng th\u00e1i n\u00e0y.'}</div>
              ) : (
                <div className="order-list">
                  {filteredOrders.map((order) => {
                    const details = Array.isArray(order.details) ? order.details : []
                    const orderStatus = (order.status || '').toLowerCase()
                    const canCancelOrder = order.canCustomerCancel || orderStatus === 'pending' || orderStatus === 'confirmed'
                    const canReorder = orderStatus === 'completed'
                    const canExportInvoice = orderStatus === 'completed'
                    const reviewProductId = details
                      .map((detail) => detail.product?.id || detail.productId)
                      .find((productId) => Number(productId) > 0)

                    return (
                      <article className="order-card shopee-order-card" key={order.id}>
                        <div className="shopee-order-header">
                          <div className="shopee-order-shop">
                            <strong>BaseCore Store</strong>
                            <span>{'\u0110\u01a1n'} #{order.id}</span>
                          </div>
                          <div className="shopee-order-status-wrap">
                            <span>{formatDate(order.orderDate)}</span>
                            <span className={`order-status ${order.status?.toLowerCase() || 'pending'}`}>
                              {toOrderStatusLabel(order.status)}
                            </span>
                            {canExportInvoice && (
                              <button
                                className="export-invoice-btn"
                                type="button"
                                onClick={() => onExportInvoice?.(order)}
                              >
                                {'Xu\u1ea5t h\u00f3a \u0111\u01a1n'}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="shopee-order-items">
                          {details.length === 0 ? (
                            <div className="shopee-order-item">
                              <div className="shopee-order-thumb placeholder">
                                <i className="fa fa-shopping-bag" />
                              </div>
                              <div className="shopee-order-product">
                                <strong>{'Chi ti\u1ebft s\u1ea3n ph\u1ea9m \u0111ang \u0111\u01b0\u1ee3c \u0111\u1ed3ng b\u1ed9'}</strong>
                                <span>{order.paymentMethodLabel || 'Ch\u01b0a x\u00e1c \u0111\u1ecbnh thanh to\u00e1n'}</span>
                              </div>
                              <div className="shopee-order-line-total">{formatCurrency(order.totalAmount)}</div>
                            </div>
                          ) : (
                            details.map((detail) => {
                              const product = detail.product || { id: detail.productId }
                              const productId = product.id || detail.productId

                              return (
                                <LinkButton
                                  className="shopee-order-item shopee-order-item-link"
                                  key={detail.id || `${order.id}-${detail.productId}`}
                                  to={`/product/${productId}`}
                                  onNavigate={onNavigate}
                                >
                                  <img
                                    className="shopee-order-thumb"
                                    src={getProductImage(product)}
                                    alt={product.name || `Product ${detail.productId}`}
                                  />
                                  <div className="shopee-order-product">
                                    <strong>{product.name || `S\u1ea3n ph\u1ea9m #${detail.productId}`}</strong>
                                    <span>{`M\u00e3 SP: ${detail.productId} | x${detail.quantity}`}</span>
                                    <small>{formatCurrency(detail.unitPrice)}</small>
                                  </div>
                                  <div className="shopee-order-line-total">
                                    {formatCurrency(detail.unitPrice * detail.quantity)}
                                  </div>
                                </LinkButton>
                              )
                            })
                          )}
                        </div>

                        <div className="shopee-order-info">
                          <span>{order.paymentMethodLabel || 'Ch\u01b0a x\u00e1c \u0111\u1ecbnh thanh to\u00e1n'}</span>
                          <span>{order.paymentStatusLabel || 'Ch\u01b0a x\u00e1c \u0111\u1ecbnh tr\u1ea1ng th\u00e1i thanh to\u00e1n'}</span>
                          <span>{order.paymentCode || `FW-${order.id}`}</span>
                        </div>

                        {order.shippingAddress && (
                          <div className="shopee-order-address">
                            <i className="fa fa-map-marker" /> {order.shippingAddress}
                          </div>
                        )}
                        {order.deliveryMessage && (
                          <div className="order-delivery-note">{order.deliveryMessage}</div>
                        )}
                        {order.paymentNote && (
                          <div className="order-payment-note">{order.paymentNote}</div>
                        )}

                        <div className="shopee-order-footer">
                          <div className="shopee-order-total">
                            <span>{'Th\u00e0nh ti\u1ec1n:'}</span>
                            <strong>{formatCurrency(order.totalAmount)}</strong>
                          </div>
                          <div className="shopee-order-actions">
                            {canCancelOrder && (
                              <button
                                className="danger-btn"
                                type="button"
                                disabled={updatingOrderId === order.id}
                                onClick={() => cancelOrder(order.id)}
                              >
                                {updatingOrderId === order.id ? '\u0110ang h\u1ee7y...' : 'H\u1ee7y \u0111\u01a1n'}
                              </button>
                            )}
                            {(order.canCustomerConfirmReceived || orderStatus === 'shipping') && (
                              <button
                                className="primary-btn"
                                type="button"
                                disabled={updatingOrderId === order.id}
                                onClick={() => confirmReceived(order.id)}
                              >
                                {updatingOrderId === order.id ? '\u0110ang x\u00e1c nh\u1eadn...' : '\u0110\u00e3 nh\u1eadn h\u00e0ng'}
                              </button>
                            )}
                            {canReorder && (
                              <>
                                <button
                                  className="secondary-btn"
                                  type="button"
                                  onClick={() => onNavigate('/store')}
                                >
                                  {'Mua l\u1ea1i'}
                                </button>
                                {reviewProductId && (
                                  <button
                                    className="primary-btn"
                                    type="button"
                                    onClick={() => onNavigate(`/product/${reviewProductId}#reviews`)}
                                  >
                                    {'\u0110\u00e1nh gi\u00e1 s\u1ea3n ph\u1ea9m'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </>
  )
}
