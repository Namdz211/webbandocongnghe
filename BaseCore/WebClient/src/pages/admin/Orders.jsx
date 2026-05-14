import { useEffect, useState } from 'react'
import DataTable from '../../components/admin/DataTable'
import OrderActions from '../../components/admin/OrderActions'
import PageHeader from '../../components/admin/PageHeader'
import Spinner from '../../components/admin/Spinner'
import { adminApi, formatCurrency, formatDate, getOrderStatusBadge, getOrderStatusLabel, getToken, ORDER_REFRESH_INTERVAL_MS } from '../../utils/admin'

function Orders({ auth }) {
  const token = getToken(auth)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionOrderId, setActionOrderId] = useState(null)

  async function loadData({ showLoading = true } = {}) {
    if (showLoading) {
      setLoading(true)
    }
    setError('')

    try {
      const data = await adminApi.getOrders(token)
      setOrders(Array.isArray(data) ? data : [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadData()
    const refreshInterval = window.setInterval(
      () => loadData({ showLoading: false }),
      ORDER_REFRESH_INTERVAL_MS,
    )

    return () => window.clearInterval(refreshInterval)
  }, [token])

  async function runOrderAction(order, action) {
    setActionOrderId(order.id)
    setError('')

    try {
      let response
      if (action === 'confirm') {
        response = await adminApi.confirmOrder(order.id, token)
      } else {
        response = await adminApi.shipOrder(order.id, token)
      }

      if (response?.order) {
        setOrders((current) =>
          current.map((currentOrder) =>
            currentOrder.id === order.id ? response.order : currentOrder,
          ),
        )
      }

      await loadData({ showLoading: false })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setActionOrderId(null)
    }
  }

  return (
    <>
      <PageHeader title="Orders Management" />
      <section className="admin-card">
        <div className="admin-card-toolbar">
          <h3>All Orders</h3>
          <button className="admin-btn primary" type="button" onClick={() => loadData()}>
            <i className="fa fa-refresh" /> Refresh
          </button>
        </div>
        {error && <div className="admin-alert danger">{error}</div>}
        {loading ? (
          <Spinner />
        ) : (
          <DataTable
            emptyText="No orders found"
            headers={['ID', 'Customer', 'Date', 'Total', 'Payment', 'Status', 'Address', 'Actions']}
            rows={orders.map((order) => [
              `#${order.id}`,
              order.userId,
              formatDate(order.orderDate),
              formatCurrency(order.totalAmount),
              `${order.paymentMethodLabel || 'N/A'} - ${order.paymentStatusLabel || 'N/A'}`,
              <span key="status" className={`admin-badge ${getOrderStatusBadge(order.status)}`}>
                {getOrderStatusLabel(order)}
              </span>,
              order.shippingAddress || 'N/A',
              <OrderActions
                key="actions"
                order={order}
                busy={actionOrderId === order.id}
                onConfirm={() => runOrderAction(order, 'confirm')}
                onShip={() => runOrderAction(order, 'ship')}
              />,
            ])}
          />
        )}
      </section>
    </>
  )
}

export default Orders
