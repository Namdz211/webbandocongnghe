import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { PAYMENT_METHODS } from '../constants/orders.js'
import LinkButton from '../components/LinkButton.jsx'
import { formatCurrency } from '../utils/formatters.js'

export default function CheckoutPage({
  auth,
  cart,
  onNavigate,
  onPlaceOrder,
  submitting,
}) {
  const [customerName, setCustomerName] = useState(auth?.name || auth?.Name || auth?.username || '')
  const [customerEmail, setCustomerEmail] = useState(auth?.email || auth?.Email || '')
  const [customerPhone, setCustomerPhone] = useState(auth?.phone || auth?.Phone || '')
  const [shippingAddress, setShippingAddress] = useState(
    auth?.address || auth?.Address || '227 Nguyễn Văn Cừ, Quận 5, Thành phố Hồ Chí Minh',
  )
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [couponCode, setCouponCode] = useState('')
  const [publicCoupons, setPublicCoupons] = useState([])

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )
  const selectedCoupon = publicCoupons.find(
    (coupon) => coupon.code?.toUpperCase() === couponCode.trim().toUpperCase(),
  )
  const couponDiscount = calculateCouponDiscount(selectedCoupon, totalAmount)
  const finalAmount = Math.max(0, totalAmount - couponDiscount)

  useEffect(() => {
    let cancelled = false

    async function loadCoupons() {
      try {
        const coupons = await api.getPublicCoupons()
        if (!cancelled) {
          setPublicCoupons(Array.isArray(coupons) ? coupons : [])
        }
      } catch {
        if (!cancelled) {
          setPublicCoupons([])
        }
      }
    }

    loadCoupons()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setCustomerName(auth?.name || auth?.Name || auth?.username || '')
    setCustomerEmail(auth?.email || auth?.Email || '')
    setCustomerPhone(auth?.phone || auth?.Phone || '')
    setShippingAddress(auth?.address || auth?.Address || '227 Nguyễn Văn Cừ, Quận 5, Thành phố Hồ Chí Minh')
  }, [auth])

  if (cart.length === 0) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty-state">
            {'Gi\u1ecf h\u00e0ng \u0111ang tr\u1ed1ng. H\u00e3y th\u00eam s\u1ea3n ph\u1ea9m tr\u01b0\u1edbc khi thanh to\u00e1n.'}
            <div className="empty-actions">
              <LinkButton to="/store" className="primary-btn" onNavigate={onNavigate}>
                {'\u0110i \u0111\u1ebfn c\u1eeda h\u00e0ng'}
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div id="breadcrumb" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h3 className="breadcrumb-header">{'Thanh to\u00e1n'}</h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    {'Trang ch\u1ee7'}
                  </LinkButton>
                </li>
                <li className="active">{'Thanh to\u00e1n'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-7">
              <div className="billing-details">
                <div className="section-title">
                  <h3 className="title">{'Th\u00f4ng tin giao h\u00e0ng'}</h3>
                </div>
                <div className="form-group">
                  <input
                    className="input"
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder={'T\u00ean kh\u00e1ch h\u00e0ng'}
                  />
                </div>
                <div className="form-group">
                  <input
                    className="input"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    placeholder="Email"
                  />
                </div>
                <div className="form-group">
                  <input
                    className="input"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="Số điện thoại"
                  />
                </div>
                <div className="form-group">
                  <textarea
                    className="input"
                    rows="5"
                    value={shippingAddress}
                    onChange={(event) => setShippingAddress(event.target.value)}
                    placeholder={'\u0110\u1ecba ch\u1ec9 giao h\u00e0ng'}
                  />
                </div>
                {!auth && (
                  <div className="order-note">
                    {'Bạn có thể đặt hàng không cần đăng nhập. Hãy nhập đúng số điện thoại để shop xác nhận đơn.'}
                    <div className="empty-actions">
                      <LinkButton
                        to="/login?redirect=/checkout"
                        className="primary-btn"
                        onNavigate={onNavigate}
                      >
                        {'\u0110\u0103ng nh\u1eadp ngay'}
                      </LinkButton>
                    </div>
                  </div>
                )}
                {publicCoupons.length > 0 && (
                  <div className="coupon-panel">
                    <div className="section-title payment-section-title">
                      <h3 className="title">Mã giảm giá</h3>
                    </div>
                    <div className="form-group coupon-input-row">
                      <input
                        className="input"
                        value={couponCode}
                        onChange={(event) => setCouponCode(event.target.value)}
                        placeholder="Nhập mã giảm giá"
                      />
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => setCouponCode(publicCoupons[0]?.code || '')}
                      >
                        Gợi ý
                      </button>
                    </div>
                    <div className="coupon-chip-list">
                      {publicCoupons.slice(0, 4).map((coupon) => (
                        <button
                          className={`coupon-chip ${couponCode.toUpperCase() === coupon.code?.toUpperCase() ? 'active' : ''}`}
                          key={coupon.id || coupon.code}
                          type="button"
                          onClick={() => setCouponCode(coupon.code || '')}
                        >
                          <strong>{coupon.code}</strong>
                          <span>{formatCouponLabel(coupon)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="section-title payment-section-title">
                  <h3 className="title">{'Ph\u01b0\u01a1ng th\u1ee9c thanh to\u00e1n'}</h3>
                </div>
                <div className="payment-method-grid">
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      className={`payment-method-card ${paymentMethod === method.id ? 'active' : ''}`}
                      key={method.id}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={paymentMethod === method.id}
                        onChange={() => setPaymentMethod(method.id)}
                      />
                      <span className="payment-method-icon">
                        <i className={`fa ${method.icon}`} />
                      </span>
                      <span>
                        <strong>{method.name}</strong>
                        <small>{method.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-md-5 order-details">
              <div className="section-title text-center">
                <h3 className="title">{'\u0110\u01a1n h\u00e0ng c\u1ee7a b\u1ea1n'}</h3>
              </div>
              <div className="order-summary">
                <div className="order-col">
                  <div>
                    <strong>{'S\u1ea2N PH\u1ea8M'}</strong>
                  </div>
                  <div>
                    <strong>{'T\u1ed4NG'}</strong>
                  </div>
                </div>
                <div className="order-products">
                  {cart.map((item) => (
                    <div className="order-col" key={item.cartKey || item.id}>
                      <div>
                        <span>{item.quantity}x {item.name}</span>
                        {item.selectedSpecSummary && (
                          <small className="order-item-options">{item.selectedSpecSummary}</small>
                        )}
                      </div>
                      <div>{formatCurrency(item.price * item.quantity)}</div>
                    </div>
                  ))}
                </div>
                <div className="order-col">
                  <div>{'Ph\u00ed giao h\u00e0ng'}</div>
                  <div>
                    <strong>{'Mi\u1ec5n ph\u00ed'}</strong>
                  </div>
                </div>
                {couponDiscount > 0 && (
                  <div className="order-col">
                    <div>{`Mã ${selectedCoupon?.code}`}</div>
                    <div>
                      <strong>-{formatCurrency(couponDiscount)}</strong>
                    </div>
                  </div>
                )}
                <div className="order-col">
                  <div>
                    <strong>{'T\u1ed4NG C\u1ed8NG'}</strong>
                  </div>
                  <div>
                    <strong className="order-total">{formatCurrency(finalAmount)}</strong>
                  </div>
                </div>
              </div>

              <button
                className="primary-btn order-submit"
                type="button"
                disabled={submitting}
                onClick={() => onPlaceOrder({
                  customerName,
                  customerEmail,
                  customerPhone,
                  shippingAddress,
                  paymentMethod,
                  couponCode,
                })}
              >
                {submitting ? '\u0110ang g\u1eedi \u0111\u01a1n...' : '\u0110\u1eb7t h\u00e0ng'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function calculateCouponDiscount(coupon, orderAmount) {
  if (!coupon || orderAmount < Number(coupon.minOrderAmount || 0)) {
    return 0
  }

  if (coupon.discountType === 'percent') {
    const percentDiscount = Math.round(orderAmount * Number(coupon.discountValue || 0) / 100)
    const maxDiscount = Number(coupon.maxDiscountAmount || 0)
    return maxDiscount > 0 ? Math.min(percentDiscount, maxDiscount) : percentDiscount
  }

  return Math.min(Number(coupon.discountValue || 0), orderAmount)
}

function formatCouponLabel(coupon) {
  if (coupon.discountType === 'percent') {
    const maxText = Number(coupon.maxDiscountAmount || 0) > 0
      ? `, tối đa ${formatCurrency(coupon.maxDiscountAmount)}`
      : ''
    return `Giảm ${coupon.discountValue}%${maxText}`
  }

  return `Giảm ${formatCurrency(coupon.discountValue)}`
}
