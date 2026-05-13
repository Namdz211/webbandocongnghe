import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client.js'
import LinkButton from './LinkButton.jsx'
import { formatCurrency } from '../utils/formatters.js'
import { getProductImage, handleProductImageError } from '../utils/productImages.js'
import { buildStorePath } from '../utils/routes.js'
import { isAdmin } from '../utils/auth.js'

export default function Header({
  auth,
  cart,
  categories,
  orderBadgeCount = 0,
  route,
  onNavigate,
  onLogout,
  onRemoveCartItem,
}) {
  const [keyword, setKeyword] = useState(route.query.keyword || '')
  const [categoryId, setCategoryId] = useState(route.query.categoryId || '')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const suggestDebounceRef = useRef(null)
  const [suggestions, setSuggestions] = useState([])
  const [isSuggestOpen, setIsSuggestOpen] = useState(false)
  const suggestRequestRef = useRef(0)
  const suggestRootRef = useRef(null)
  const suggestInputRef = useRef(null)
  const accountMenuRef = useRef(null)

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return undefined
    }

    const closeAccountMenu = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', closeAccountMenu)
    return () => document.removeEventListener('mousedown', closeAccountMenu)
  }, [isAccountMenuOpen])

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )
  const featuredCategories = categories.slice(0, 4)

  useEffect(() => {
    const normalizedKeyword = keyword.trim()

    window.clearTimeout(suggestDebounceRef.current)

    if (!normalizedKeyword) {
      return undefined
    }

    const requestId = ++suggestRequestRef.current

    suggestDebounceRef.current = window.setTimeout(async () => {
      try {
        const data = await api.getProducts({
          keyword: normalizedKeyword,
          categoryId: categoryId || undefined,
          page: 1,
          pageSize: 6,
        })

        if (requestId !== suggestRequestRef.current) {
          return
        }

        setSuggestions(Array.isArray(data?.items) ? data.items : [])
        setIsSuggestOpen(true)
      } catch {
        if (requestId !== suggestRequestRef.current) {
          return
        }

        setSuggestions([])
      }
    }, 220)

    return () => window.clearTimeout(suggestDebounceRef.current)
  }, [keyword, categoryId])

  const submitSearch = (event) => {
    event.preventDefault()
    setIsSuggestOpen(false)
    onNavigate(buildStorePath({ keyword, categoryId, page: 1 }))
  }

  return (
    <>
      <header>
        <div id="top-header">
          <div className="container">
            <ul className="header-links pull-left">
              <li>
                <a href="tel:+84000000000">
                  <i className="fa fa-phone" /> 0975274355
                </a>
              </li>
              <li>
                <a href="mailto:support@basecore.vn">
                  <i className="fa fa-envelope-o" /> hnmobile@mta.vn
                </a>
              </li>
              <li>
                <a href="https://www.google.com/maps/place/H%E1%BB%8Dc+vi%E1%BB%87n+K%E1%BB%B9+thu%E1%BA%ADt+Qu%C3%A2n+s%E1%BB%B1/@21.0467556,105.7838428,17z/data=!3m1!4b1!4m6!3m5!1s0x3135ab2d88bb4195:0x3006e474cce20274!8m2!3d21.0467556!4d105.7864177!16s%2Fm%2F03hl9kl?entry=ttu&g_ep=EgoyMDI2MDQyMC4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noreferrer">
                  <i className="fa fa-map-marker" /> Học viện Kỹ thuật Quân sự
                </a>
              </li>
            </ul>
            <ul className="header-links pull-right">
              <li>
                <button className="header-link-button" type="button">
                  <i className="fa fa-dollar" /> VND
                </button>
              </li>
              <li className="account-menu-wrap" ref={accountMenuRef}>
                {auth ? (
                  <>
                    <button
                      className="header-link-button account-menu-trigger"
                      type="button"
                      aria-expanded={isAccountMenuOpen}
                      onClick={() => setIsAccountMenuOpen((current) => !current)}
                    >
                      <i className="fa fa-user-o" /> {auth.name || auth.Name || auth.username || auth.Username}
                      <i className="fa fa-angle-down" />
                    </button>
                    {isAccountMenuOpen && (
                      <div className="account-menu">
                        <div className="account-menu-user">
                          <span>{auth.name || auth.Name || auth.username || auth.Username}</span>
                          <small>{auth.email || auth.Email || 'Chưa có email'}</small>
                        </div>
                        <button
                          className="account-menu-item"
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false)
                            onNavigate('/account')
                          }}
                        >
                          <i className="fa fa-id-card-o" /> Thông tin cá nhân
                        </button>
                        <button
                          className="account-menu-item"
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false)
                            onNavigate('/account?section=password')
                          }}
                        >
                          <i className="fa fa-key" /> Đổi mật khẩu
                        </button>
                        <button
                          className="account-menu-item"
                          type="button"
                          onClick={() => {
                            setIsAccountMenuOpen(false)
                            onLogout()
                          }}
                        >
                          <i className="fa fa-sign-out" /> Đăng xuất
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <LinkButton to="/login" className="header-link-button" onNavigate={onNavigate}>
                    <i className="fa fa-user-o" /> Đăng nhập
                  </LinkButton>
                )}
              </li>
            </ul>
          </div>
        </div>

        <div id="header">
          <div className="container">
            <div className="row">
              <div className="col-md-3">
                <div className="header-logo">
                  <LinkButton to="/" className="logo brand-logo" onNavigate={onNavigate}>
                    <img src="/electro/img/logo.png" alt="BaseCore Store" />
                    <span className="brand-tagline">HN Mobile</span>
                  </LinkButton>
                </div>
              </div>

              <div className="col-md-6">
                <div className="header-search">
                  <form onSubmit={submitSearch}>
                    <select
                      className="input-select"
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                    >
                      <option value="">Tất cả danh mục</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <div className="search-input-wrap" ref={suggestRootRef}>
                      <input
                        className="input"
                        placeholder="Tìm sản phẩm, mô tả, danh mục..."
                        ref={suggestInputRef}
                        value={keyword}
                        onChange={(event) => {
                          const nextKeyword = event.target.value
                          setKeyword(nextKeyword)
                          if (!nextKeyword.trim()) {
                            setSuggestions([])
                          }
                          setIsSuggestOpen(true)
                        }}
                        onFocus={() => setIsSuggestOpen(true)}
                        autoComplete="off"
                      />
                      {isSuggestOpen && suggestions.length > 0 && (
                        <div className="search-suggestions" role="listbox">
                          {suggestions.map((product) => (
                            <button
                              key={product.id}
                              className="search-suggestion"
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setIsSuggestOpen(false)
                                onNavigate(`/product/${product.id}`)
                              }}
                            >
                              <img
                                className="search-suggestion-image"
                                src={getProductImage(product)}
                                alt={product.name}
                              />
                              <span className="search-suggestion-info">
                                <span className="search-suggestion-name">{product.name}</span>
                                <span className="search-suggestion-price">
                                  {formatCurrency(product.price)}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {isSuggestOpen && keyword.trim() && suggestions.length === 0 && (
                        <div className="search-suggestions search-suggestions-empty" role="status">
                          <div className="search-suggestion-empty">Không có sản phẩm phù hợp.</div>
                        </div>
                      )}
                    </div>
                    <button className="search-btn" type="submit">
                      Tìm kiếm
                    </button>
                  </form>
                </div>
              </div>

              <div className="col-md-3 clearfix">
                <div className="header-ctn">
                  <div>
                    <LinkButton to="/orders" onNavigate={onNavigate}>
                      <i className="fa fa-list-alt" />
                      <span>Đơn của tôi</span>
                      {auth && orderBadgeCount > 0 && (
                        <div className="qty">{orderBadgeCount}</div>
                      )}
                    </LinkButton>
                  </div>

                  <div className={`dropdown ${isCartOpen ? 'open' : ''}`}>
                    <a
                      className="dropdown-toggle"
                      aria-controls="cart-dropdown"
                      aria-expanded={isCartOpen}
                      href="#cart-dropdown"
                      onClick={(event) => {
                        event.preventDefault()
                        setIsCartOpen((current) => !current)
                      }}
                    >
                      <i className="fa fa-shopping-cart" />
                      <span>Giỏ hàng</span>
                      <div className="qty">{cartCount}</div>
                    </a>
                    <div className="cart-dropdown" id="cart-dropdown">
                      <div className="cart-list">
                        {cart.length === 0 ? (
                          <div className="empty-dropdown">Chưa có sản phẩm trong giỏ.</div>
                        ) : (
                          cart.map((item) => (
                            <div className="product-widget" key={item.cartKey || item.id}>
                              <div className="product-img">
                                <img
                                  src={getProductImage(item)}
                                  alt={item.name}
                                  onError={(event) => handleProductImageError(event, item)}
                                />
                              </div>
                              <div className="product-body">
                                <h3 className="product-name">
                                  <LinkButton
                                    to={`/product/${item.id}`}
                                    onNavigate={onNavigate}
                                  >
                                    {item.name}
                                  </LinkButton>
                                </h3>
                                <h4 className="product-price">
                                  <span className="qty">{item.quantity}x</span>
                                  {formatCurrency(item.price)}
                                </h4>
                                {item.selectedSpecSummary && (
                                  <p className="cart-item-options">{item.selectedSpecSummary}</p>
                                )}
                              </div>
                              <button
                                className="delete"
                                type="button"
                                onClick={() => onRemoveCartItem(item.cartKey || item.id)}
                              >
                                <i className="fa fa-close" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="cart-summary">
                        <small>{cartCount} Sản phẩm đã chọn</small>
                        <h5>TẠM TÍNH: {formatCurrency(cartTotal)}</h5>
                      </div>
                      <div className="cart-btns">
                        <LinkButton to="/store" onNavigate={onNavigate}>
                          Tiếp tục mua
                        </LinkButton>
                        <LinkButton to="/checkout" onNavigate={onNavigate}>
                          Thanh toán <i className="fa fa-arrow-circle-right" />
                        </LinkButton>
                      </div>
                    </div>
                  </div>

                  <div className="menu-toggle">
                    <LinkButton to="/store" onNavigate={onNavigate}>
                      <i className="fa fa-bars" />
                      <span>Danh mục</span>
                    </LinkButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav id="navigation">
        <div className="container">
          <div id="responsive-nav">
            <ul className="main-nav nav navbar-nav">
              <li className={route.name === 'home' ? 'active' : ''}>
                <LinkButton to="/" onNavigate={onNavigate}>
                  Trang chủ
                </LinkButton>
              </li>
              <li className={route.name === 'store' ? 'active' : ''}>
                <LinkButton to="/store" onNavigate={onNavigate}>
                  Cửa hàng
                </LinkButton>
              </li>
              {featuredCategories.map((category) => (
                <li
                  className={
                    route.query.categoryId === String(category.id) ? 'active' : ''
                  }
                  key={category.id}
                >
                  <LinkButton
                    to={buildStorePath({ categoryId: category.id })}
                    onNavigate={onNavigate}
                  >
                    {category.name}
                  </LinkButton>
                </li>
              ))}
              <li className={route.name === 'orders' ? 'active' : ''}>
                <LinkButton to="/orders" onNavigate={onNavigate}>
                  Đơn hàng
                </LinkButton>
              </li>
              {isAdmin(auth) && (
                <li className={route.name.startsWith('admin') ? 'active' : ''}>
                  <LinkButton to="/admin" onNavigate={onNavigate}>
                    Admin
                  </LinkButton>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </>
  )
}
