import { useState } from 'react'
import LinkButton from '../../components/LinkButton'
import { formatCurrency, PAYMENT_METHODS } from '../../utils/storefront'

function CheckoutPage({
  auth,
  cart,
  onNavigate,
  onPlaceOrder,
  submitting,
}) {
  const [shippingAddress, setShippingAddress] = useState(
    '227 Nguy\u1ec5n V\u0103n C\u1eeb, Qu\u1eadn 5, Th\u00e0nh ph\u1ed1 H\u1ed3 Ch\u00ed Minh',
  )
  const [paymentMethod, setPaymentMethod] = useState('cod')

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )

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
                    value={auth?.name || auth?.username || ''}
                    disabled
                    placeholder={'T\u00ean kh\u00e1ch h\u00e0ng'}
                  />
                </div>
                <div className="form-group">
                  <input
                    className="input"
                    value={auth?.email || ''}
                    disabled
                    placeholder="Email"
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
                  <div className="order-note danger-note">
                    {'B\u1ea1n c\u1ea7n \u0111\u0103ng nh\u1eadp \u0111\u1ec3 t\u1ea1o \u0111\u01a1n h\u00e0ng. H\u1ec7 th\u1ed1ng FW y\u00eau c\u1ea7u JWT token cho endpoint `/api/orders`.'}
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
                    <div className="order-col" key={item.id}>
                      <div>
                        {item.quantity}x {item.name}
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
                <div className="order-col">
                  <div>
                    <strong>{'T\u1ed4NG C\u1ed8NG'}</strong>
                  </div>
                  <div>
                    <strong className="order-total">{formatCurrency(totalAmount)}</strong>
                  </div>
                </div>
              </div>

              <button
                className="primary-btn order-submit"
                type="button"
                disabled={!auth || submitting}
                onClick={() => onPlaceOrder(shippingAddress, paymentMethod)}
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

export default CheckoutPage
