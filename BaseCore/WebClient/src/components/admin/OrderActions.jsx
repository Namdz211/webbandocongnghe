function OrderActions({ order, busy, onConfirm, onShip }) {
  const status = (order.status || '').toLowerCase()
  const canConfirm = status === 'pending'
  const canShip = status === 'confirmed'

  if (!canConfirm && !canShip) {
    return <span className="admin-muted">Không có thao tác</span>
  }

  return (
    <div className="admin-row-actions">
      {canConfirm && (
        <button className="admin-btn small success" type="button" disabled={busy} onClick={onConfirm}>
          <i className="fa fa-check" /> Xác nhận
        </button>
      )}
      {canShip && (
        <button className="admin-btn small info" type="button" disabled={busy} onClick={onShip}>
          <i className="fa fa-truck" /> Bàn giao VC
        </button>
      )}
    </div>
  )
}

export default OrderActions
