import {
  startTransition,
  useEffect,
  useRef,
  useState,
} from 'react'
import AdminApp from './admin/AdminApp'

const FALLBACK_IMAGES = [
  '/electro/img/product01.png',
  '/electro/img/product02.png',
  '/electro/img/product03.png',
  '/electro/img/product04.png',
  '/electro/img/product05.png',
  '/electro/img/product06.png',
  '/electro/img/product07.png',
  '/electro/img/product08.png',
  '/electro/img/macbookneo.png',
]

const SHOP_IMAGES = [
  '/electro/img/shop01.png',
  '/electro/img/shop02.png',
  '/electro/img/shop03.png',
]

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const STORAGE_KEYS = {
  auth: 'electro-store-auth',
  cart: 'electro-store-cart',
}

const PAYMENT_METHODS = [
  {
    id: 'momo',
    name: 'V\u00ed MoMo',
    description: 'Thanh to\u00e1n b\u1eb1ng v\u00ed MoMo \u0111\u1ec3 \u0111\u1eb7t h\u00e0ng th\u00e0nh c\u00f4ng.',
    icon: 'fa-mobile',
  },
  {
    id: 'zalopay',
    name: 'V\u00ed ZaloPay',
    description: 'Thanh to\u00e1n b\u1eb1ng v\u00ed ZaloPay \u0111\u1ec3 \u0111\u1eb7t h\u00e0ng th\u00e0nh c\u00f4ng.',
    icon: 'fa-credit-card',
  },
  {
    id: 'bank_transfer',
    name: 'Chuy\u1ec3n kho\u1ea3n ng\u00e2n h\u00e0ng',
    description: 'Chuy\u1ec3n kho\u1ea3n theo m\u00e3 thanh to\u00e1n c\u1ee7a \u0111\u01a1n h\u00e0ng.',
    icon: 'fa-university',
  },
  {
    id: 'counter',
    name: 'Thanh to\u00e1n t\u1ea1i qu\u1ea7y/v\u0103n ph\u00f2ng',
    description: 'Thanh to\u00e1n tr\u1ef1c ti\u1ebfp t\u1ea1i qu\u1ea7y ho\u1eb7c v\u0103n ph\u00f2ng khi nh\u1eadn/x\u00e1c nh\u1eadn \u0111\u01a1n.',
    icon: 'fa-building-o',
  },
]

function readStorage(key, fallbackValue) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallbackValue
  } catch {
    return fallbackValue
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function getAuthToken(auth) {
  return auth?.token || auth?.Token || ''
}

function getAuthUserId(auth) {
  return auth?.userId || auth?.UserId || auth?.id || auth?.Id || ''
}

function getJwtPayload(token) {
  if (!token) {
    return null
  }

  try {
    const payload = token.split('.')[1]
    if (!payload) {
      return null
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    )

    return JSON.parse(window.atob(padded))
  } catch {
    return null
  }
}

function isExpiredToken(token) {
  const payload = getJwtPayload(token)

  if (!payload?.exp) {
    return false
  }

  return payload.exp * 1000 <= Date.now()
}

function getResponseMessage(data, response) {
  if (response.status === 401) {
    return 'Phiên đăng nhập đã hết hạn hoặc token không hợp lệ. Hãy đăng nhập lại bằng tài khoản admin.'
  }

  if (response.status === 403) {
    return 'Tài khoản hiện tại không có quyền admin để thực hiện thao tác này.'
  }

  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message
    }

    if (data.errors && typeof data.errors === 'object') {
      const validationMessages = Object.values(data.errors)
        .flat()
        .filter(Boolean)

      if (validationMessages.length > 0) {
        return validationMessages.join(' ')
      }
    }

    if (typeof data.title === 'string' && data.title.trim()) {
      return data.title
    }
  }

  return `Backend trả lỗi ${response.status}. Kiểm tra lại API/gateway và dữ liệu SQL Server.`
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0))
}

function formatDate(value) {
  if (!value) {
    return 'N/A'
  }

  try {
    return dateFormatter.format(new Date(value))
  } catch {
    return value
  }
}

function normalizeProductImageUrl(rawImageUrl) {
  const imageUrl = rawImageUrl?.trim()

  if (!imageUrl) {
    return ''
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  const normalizedPath = imageUrl.replace(/\\/g, '/')

  if (normalizedPath.startsWith('/electro/img/')) {
    return normalizedPath
  }

  if (normalizedPath.startsWith('electro/img/')) {
    return `/${normalizedPath}`
  }

  if (normalizedPath.startsWith('/img/')) {
    return normalizedPath
  }

  if (normalizedPath.startsWith('img/')) {
    return `/${normalizedPath}`
  }

  if (/^[a-zA-Z]:\//.test(normalizedPath) || normalizedPath.startsWith('file:///')) {
    const fileName = normalizedPath.split('/').filter(Boolean).pop()
    return fileName ? `/electro/img/${fileName}` : ''
  }

  if (normalizedPath.startsWith('/')) {
    return normalizedPath
  }

  const fileName = normalizedPath.split('/').filter(Boolean).pop()
  return fileName ? `/electro/img/${fileName}` : ''
}

function getProductImage(product) {
  const imageUrl = normalizeProductImageUrl(product?.imageUrl)

  if (imageUrl) {
    return imageUrl
  }

  const fallbackIndex = Number(product?.id || 0) % FALLBACK_IMAGES.length
  return FALLBACK_IMAGES[fallbackIndex]
}

function toOrderStatusLabel(status) {
  switch ((status || '').toLowerCase()) {
    case 'completed':
      return 'Ho\u00e0n t\u1ea5t'
    case 'cancelled':
      return '\u0110\u00e3 h\u1ee7y'
    default:
      return '\u0110ang x\u1eed l\u00fd'
  }
}

function isAdmin(auth) {
  return String(auth?.role || auth?.Role || '').toLowerCase() === 'admin'
}

function buildStorePath({
  keyword = '',
  categoryId = '',
  page = 1,
} = {}) {
  const params = new URLSearchParams()
  const normalizedKeyword = keyword.trim()

  if (normalizedKeyword) {
    params.set('keyword', normalizedKeyword)
  }

  if (categoryId) {
    params.set('categoryId', String(categoryId))
  }

  if (page > 1) {
    params.set('page', String(page))
  }

  const query = params.toString()
  return query ? `/store?${query}` : '/store'
}

function parseRoute() {
  const url = new URL(window.location.href)
  const pathname = url.pathname.replace(/\/+$/, '') || '/'
  const query = Object.fromEntries(url.searchParams.entries())

  if (pathname === '/' || pathname === '') {
    return { name: 'home', pathname: '/', query }
  }

  if (pathname === '/store') {
    return { name: 'store', pathname, query }
  }

  if (pathname.startsWith('/product/')) {
    return {
      name: 'product',
      pathname,
      query,
      params: { id: pathname.split('/').pop() },
    }
  }

  if (pathname === '/checkout') {
    return { name: 'checkout', pathname, query }
  }

  if (pathname === '/orders') {
    return { name: 'orders', pathname, query }
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return { name: 'admin', pathname, query }
  }

  if (pathname === '/account') {
    return { name: 'account', pathname, query }
  }

  if (pathname === '/login') {
    return { name: 'login', pathname, query }
  }

  return { name: 'notFound', pathname, query }
}

async function request(path, options = {}) {
  const { token, ...restOptions } = options
  let response

  try {
    response = await fetch(`/api${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(restOptions.headers || {}),
      },
      ...restOptions,
    })
  } catch {
    throw new Error(
      'Không kết nối được backend. Hãy chạy BaseCore.APIService ở cổng 5001 và BaseCore.AuthService ở cổng 5002.',
    )
  }

  const raw = await response.text()
  let data = null

  if (raw) {
    try {
      data = JSON.parse(raw)
    } catch {
      data = raw
    }
  }

  if (!response.ok) {
    const error = new Error(getResponseMessage(data, response))
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

function toQueryString(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    searchParams.set(key, String(value))
  })

  return searchParams.toString()
}

const api = {
  getCategories: () => request('/categories'),
  getProducts: (params = {}) =>
    request(`/products?${toQueryString(params)}`),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (payload, token) =>
    request('/products', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  updateProduct: (id, payload, token) =>
    request(`/products/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),
  deleteProduct: (id, token) =>
    request(`/products/${id}`, {
      method: 'DELETE',
      token,
    }),
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUser: (id, payload, token) =>
    request(`/users/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),
  getOrders: (token) =>
    request('/orders', {
      token,
    }),
  createOrder: (payload, token) =>
    request('/orders', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
}

function LinkButton({ to, className = '', onNavigate, children }) {
  return (
    <a
      className={className}
      href={to}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return
        }

        event.preventDefault()
        onNavigate(to)
      }}
    >
      {children}
    </a>
  )
}

function Header({
  auth,
  cart,
  categories,
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
    setKeyword(route.query.keyword || '')
    setCategoryId(route.query.categoryId || '')
  }, [route.query.keyword, route.query.categoryId])

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
      setSuggestions([])
      return
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
                  <i className="fa fa-phone" /> 097527435
                </a>
              </li>
              <li>
                <a href="mailto:support@basecore.vn">
                  <i className="fa fa-envelope-o" /> support@basecore.vn
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
                    <span className="brand-tagline">Storefront</span>
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
                          setKeyword(event.target.value)
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
                      {auth && <div className="qty">1</div>}
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
                            <div className="product-widget" key={item.id}>
                              <div className="product-img">
                                <img src={getProductImage(item)} alt={item.name} />
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
                              </div>
                              <button
                                className="delete"
                                type="button"
                                onClick={() => onRemoveCartItem(item.id)}
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
                <li className={route.name === 'adminProducts' ? 'active' : ''}>
                  <LinkButton to="/admin/products" onNavigate={onNavigate}>
                    Quản trị sản phẩm
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

function Footer() {
  return (
    <footer id="footer" className="ecommerce-footer">
      <div className="footer-main-section">
        <div className="container">
          <div className="footer-grid">

            <div className="footer-col">
              <h3 className="footer-title">Liên hệ &amp; Hỗ trợ</h3>
              <ul className="footer-contact">
                <li><i className="fa fa-map-marker" /><a href="https://www.google.com/maps/place/H%E1%BB%8Dc+vi%E1%BB%87n+K%E1%BB%B9+thu%E1%BA%ADt+Qu%C3%A2n+s%E1%BB%B1/@21.0467556,105.7838428,17z" target="_blank" rel="noreferrer">236 Hoàng Quốc Việt, Hà Nội</a></li>
                <li><i className="fa fa-phone" /><a href="tel:+84900000000">0900 000 000</a></li>
                <li><i className="fa fa-clock-o" /><span>08h00 – 22h00 mỗi ngày</span></li>
                <li><i className="fa fa-envelope-o" /><a href="mailto:support@basecore.vn">support@basecore.vn</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h3 className="footer-title">Về chúng tôi</h3>
              <ul className="footer-links">
                <li><a href="/store"><i className="fa fa-angle-right" /> Cửa hàng</a></li>
                <li><a href="/checkout"><i className="fa fa-angle-right" /> Thanh toán</a></li>
                <li><a href="/orders"><i className="fa fa-angle-right" /> Theo dõi đơn hàng</a></li>
                <li><a href="#"><i className="fa fa-angle-right" /> Chính sách đổi trả</a></li>
                <li><a href="#"><i className="fa fa-angle-right" /> Bảo hành sản phẩm</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h3 className="footer-title">Công nghệ</h3>
              <ul className="footer-links">
                <li><a href="#"><i className="fa fa-angle-right" /> React 19 + Vite</a></li>
                <li><a href="#"><i className="fa fa-angle-right" /> Gateway Ocelot</a></li>
                <li><a href="#"><i className="fa fa-angle-right" /> Auth JWT</a></li>
                <li><a href="#"><i className="fa fa-angle-right" /> Product + Order API</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h3 className="footer-title">Kết nối với chúng tôi</h3>
              <div className="social-links" style={{marginBottom: "20px"}}>
                <a href="#" className="social-link facebook" title="Facebook"><i className="fa fa-facebook" /></a>
                <a href="#" className="social-link instagram" title="Instagram"><i className="fa fa-instagram" /></a>
                <a href="#" className="social-link youtube" title="YouTube"><i className="fa fa-youtube" /></a>
                <a href="#" className="social-link twitter" title="Twitter"><i className="fa fa-twitter" /></a>
              </div>
              <h4 style={{color:"#fff", fontSize:"14px", marginBottom:"10px", fontWeight:500}}>Phương thức thanh toán</h4>
              <div style={{display:"flex", flexWrap:"wrap", gap:"8px"}}>
                {["COD","VNPay","Momo","ZaloPay","Thẻ ATM"].map(pm => (
                  <span key={pm} style={{padding:"4px 10px", background:"#2a2a2a", border:"1px solid #444", borderRadius:"4px", fontSize:"12px", color:"#ccc"}}>{pm}</span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <div className="footer-bottom-inner">
            <ul className="legal-links">
              <li><a href="#">Điều khoản sử dụng</a></li>
              <li><a href="#">Chính sách bảo mật</a></li>
              <li><a href="#">Cookie</a></li>
            </ul>
            <div className="footer-copyright">
              <p>© {new Date().getFullYear()} BaseCore WebClient. All rights reserved.</p>
              <p className="powered-by">Powered by React + Vite + Ocelot Gateway</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

function ProductCard({ product, onNavigate, onAddToCart, onBuyNow }) {
  return (
    <div className="col-md-4 col-xs-6" key={product.id}>
      <div className="product">
        <div className="product-img">
          <img src={getProductImage(product)} alt={product.name} />
          <div className="product-label">
            {product.stock < 5 && <span className="sale">Sắp hết</span>}
            <span className="new">Mới</span>
          </div>
        </div>
        <div className="product-body">
          <p className="product-category">{product.category?.name || 'Sản phẩm'}</p>
          <h3 className="product-name">
            <LinkButton to={`/product/${product.id}`} onNavigate={onNavigate}>
              {product.name}
            </LinkButton>
          </h3>
          <h4 className="product-price">{formatCurrency(product.price)}</h4>
          <div className="product-rating">
            <i className="fa fa-star" />
            <i className="fa fa-star" />
            <i className="fa fa-star" />
            <i className="fa fa-star" />
            <i className="fa fa-star-o" />
          </div>
          <div className="product-btns">
            <button
              className="add-to-wishlist"
              type="button"
              onClick={() => onNavigate(`/product/${product.id}`)}
            >
              <i className="fa fa-eye" />
              <span className="tooltipp">Xem chi tiết</span>
            </button>
            <button
              className="quick-view"
              type="button"
              onClick={() => onAddToCart(product, 1)}
            >
              <i className="fa fa-shopping-bag" />
              <span className="tooltipp">Thêm vào giỏ</span>
            </button>
          </div>
        </div>
        <div className="add-to-cart">
          <div className="product-action-row">
            <button className="add-to-cart-btn" type="button" onClick={() => onAddToCart(product, 1)}>
              <i className="fa fa-shopping-cart" /> Thêm vào giỏ
            </button>
            <button className="buy-now-btn" type="button" onClick={() => onBuyNow(product, 1)}>
              Mua ngay
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HeroShops({ categories, onNavigate }) {
  const topCategories = categories.slice(0, 3)

  return (
    <div className="section">
      <div className="container">
        <div className="row">
          {topCategories.map((category, index) => (
            <div className="col-md-4 col-xs-6" key={category.id}>
              <div className="shop">
                <div className="shop-img">
                  <img src={SHOP_IMAGES[index % SHOP_IMAGES.length]} alt={category.name} />
                </div>
                <div className="shop-body">
                  <h3>
                    {category.name}
                    <br />
                    Collection
                  </h3>
                  <LinkButton
                    to={buildStorePath({ categoryId: category.id })}
                    className="cta-btn"
                    onNavigate={onNavigate}
                  >
                    Mua ngay <i className="fa fa-arrow-circle-right" />
                  </LinkButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ title, description, linkTo, onNavigate }) {
  return (
    <div className="section-title">
      <h3 className="title">{title}</h3>
      <div className="section-nav">
        {description && <span className="section-copy">{description}</span>}
        {linkTo && (
          <LinkButton className="section-link" to={linkTo} onNavigate={onNavigate}>
            Xem tất cả
          </LinkButton>
        )}
      </div>
    </div>
  )
}

function HomePage({
  categories,
  highlightedProducts,
  onNavigate,
  onAddToCart,
  onBuyNow,
}) {
  const featuredProducts = highlightedProducts.slice(0, 8)
  const topSellingProducts = highlightedProducts.slice(0, 4)

  return (
    <>
      <HeroShops categories={categories} onNavigate={onNavigate} />

      <div className="section">
        <div className="container">
          <SectionHeader
            title="Sản phẩm nổi bật"
            description="Lấy dữ liệu trực tiếp từ FW API Gateway"
            linkTo="/store"
            onNavigate={onNavigate}
          />
          <div className="row">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onNavigate={onNavigate}
                onAddToCart={onAddToCart}
                onBuyNow={onBuyNow}
              />
            ))}
          </div>
        </div>
      </div>

      <div id="hot-deal" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <div className="hot-deal">
                <ul className="hot-deal-countdown">
                  <li>
                    <div>
                      <h3>24</h3>
                      <span>Giờ</span>
                    </div>
                  </li>
                  <li>
                    <div>
                      <h3>60</h3>
                      <span>Phut</span>
                    </div>
                  </li>
                  <li>
                    <div>
                      <h3>60</h3>
                      <span>Giay</span>
                    </div>
                  </li>
                </ul>
                <h2 className="text-uppercase">Giao diện Electro + backend FW</h2>
                <p>Storefront đã sẵn sàng cho luồng đặt hàng và tài khoản</p>
                <LinkButton to="/checkout" className="primary-btn cta-btn" onNavigate={onNavigate}>
                  Đi đến thanh toán
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <SectionHeader
            title="Bán chạy"
            description="Những sản phẩm mới cập nhật trong hệ thống"
            linkTo="/store"
            onNavigate={onNavigate}
          />
          <div className="row">
            {topSellingProducts.map((product) => (
              <div className="col-md-3 col-sm-6 col-xs-6" key={product.id}>
                <div className="product-widget">
                  <div className="product-img">
                    <img src={getProductImage(product)} alt={product.name} />
                  </div>
                  <div className="product-body">
                    <p className="product-category">{product.category?.name || 'Sản phẩm'}</p>
                    <h3 className="product-name">
                      <LinkButton to={`/product/${product.id}`} onNavigate={onNavigate}>
                        {product.name}
                      </LinkButton>
                    </h3>
                    <h4 className="product-price">{formatCurrency(product.price)}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function StorePage({ categories, route, onNavigate, onAddToCart, onBuyNow }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const currentPage = Math.max(1, Number(route.query.page || 1))
  const keyword = route.query.keyword || ''
  const categoryId = route.query.categoryId || ''

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      setLoading(true)
      setError('')

      try {
        const response = await api.getProducts({
          keyword,
          categoryId,
          page: currentPage,
          pageSize: 9,
        })

        if (cancelled) {
          return
        }

        setProducts(response.items || [])
        setTotalPages(response.totalPages || 1)
        setTotalCount(response.totalCount || 0)
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [categoryId, currentPage, keyword])

  return (
    <>
      <div id="breadcrumb" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h3 className="breadcrumb-header">Cửa hàng</h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chủ
                  </LinkButton>
                </li>
                <li className="active">Danh sách sản phẩm</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="row">
            <div id="aside" className="col-md-3">
              <div className="aside">
                <h3 className="aside-title">Danh mục</h3>
                <div className="checkbox-filter category-filter-list">
                  <div className="input-checkbox">
                    <label className={!categoryId ? 'is-selected' : ''}>
                      <LinkButton
                        to={buildStorePath({ keyword })}
                        onNavigate={onNavigate}
                      >
                        Tất cả sản phẩm
                      </LinkButton>
                    </label>
                  </div>
                  {categories.map((category) => (
                    <div className="input-checkbox" key={category.id}>
                      <label
                        className={
                          categoryId === String(category.id) ? 'is-selected' : ''
                        }
                      >
                        <LinkButton
                          to={buildStorePath({
                            keyword,
                            categoryId: category.id,
                          })}
                          onNavigate={onNavigate}
                        >
                          {category.name}
                        </LinkButton>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="aside">
                <h3 className="aside-title">Thông tin bộ lọc</h3>
                <div className="category-filter-note">
                  <p>
                    Từ khóa: <strong>{keyword || 'Không có'}</strong>
                  </p>
                  <p>
                    Tổng kết quả: <strong>{totalCount}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div id="store" className="col-md-9">
              <div className="store-filter clearfix">
                <div className="store-sort">
                  <label>
                    Trang hiện tại:
                    <span className="input-select inline-note">{currentPage}</span>
                  </label>
                </div>
                <div className="store-grid">
                  <span className="store-qty">{totalCount} sản phẩm</span>
                </div>
              </div>

              {loading ? (
                <div className="empty-state">Đang tải dữ liệu sản phẩm...</div>
              ) : error ? (
                <div className="empty-state error-state">{error}</div>
              ) : products.length === 0 ? (
                <div className="empty-state">
                  Không tìm thấy sản phẩm phù hợp bộ lọc hiện tại.
                </div>
              ) : (
                <div className="products-grid">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onNavigate={onNavigate}
                      onAddToCart={onAddToCart}
                      onBuyNow={onBuyNow}
                    />
                  ))}
                </div>
              )}

              <div className="store-filter clearfix">
                <ul className="store-pagination">
                  <li className={currentPage === 1 ? 'disabled' : ''}>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(
                          buildStorePath({
                            keyword,
                            categoryId,
                            page: currentPage - 1,
                          }),
                        )
                      }
                    >
                      <i className="fa fa-angle-left" />
                    </button>
                  </li>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                    (page) => (
                      <li
                        className={page === currentPage ? 'active' : ''}
                        key={page}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onNavigate(
                              buildStorePath({ keyword, categoryId, page }),
                            )
                          }
                        >
                          {page}
                        </button>
                      </li>
                    ),
                  )}
                  <li className={currentPage === totalPages ? 'disabled' : ''}>
                    <button
                      type="button"
                      onClick={() =>
                        onNavigate(
                          buildStorePath({
                            keyword,
                            categoryId,
                            page: currentPage + 1,
                          }),
                        )
                      }
                    >
                      <i className="fa fa-angle-right" />
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function ProductPage({ productId, onNavigate, onAddToCart, onBuyNow }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function loadProduct() {
      setLoading(true)
      setError('')
      setQuantity(1)

      try {
        const currentProduct = await api.getProduct(productId)

        if (cancelled) {
          return
        }

        setProduct(currentProduct)

        const relatedResponse = await api.getProducts({
          categoryId: currentProduct.categoryId,
          page: 1,
          pageSize: 4,
        })

        if (!cancelled) {
          setRelatedProducts(
            (relatedResponse.items || []).filter((item) => item.id !== currentProduct.id),
          )
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProduct()

    return () => {
      cancelled = true
    }
  }, [productId])

  return (
    <>
      <div id="breadcrumb" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h3 className="breadcrumb-header">Chi tiết sản phẩm</h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chủ
                  </LinkButton>
                </li>
                <li>
                  <LinkButton to="/store" onNavigate={onNavigate}>
                    Cửa hàng
                  </LinkButton>
                </li>
                <li className="active">{product?.name || 'Đang tải'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          {loading ? (
            <div className="empty-state">Đang tải chi tiết sản phẩm...</div>
          ) : error || !product ? (
            <div className="empty-state error-state">{error || 'Không tìm thấy sản phẩm.'}</div>
          ) : (
            <>
              <div className="row">
                <div className="col-md-5 col-md-push-2">
                  <div id="product-main-img" className="product-preview">
                    <img src={getProductImage(product)} alt={product.name} />
                  </div>
                </div>

                <div className="col-md-2 col-md-pull-5">
                  <div id="product-imgs" className="product-preview-nav">
                    <img src={getProductImage(product)} alt={product.name} />
                    <img
                      src={FALLBACK_IMAGES[(Number(product.id) + 1) % FALLBACK_IMAGES.length]}
                      alt={`${product.name} gallery`}
                    />
                    <img
                      src={FALLBACK_IMAGES[(Number(product.id) + 2) % FALLBACK_IMAGES.length]}
                      alt={`${product.name} gallery`}
                    />
                  </div>
                </div>

                <div className="col-md-5">
                  <div className="product-details">
                    <h2 className="product-name">{product.name}</h2>
                    <div>
                      <div className="product-rating">
                        <i className="fa fa-star" />
                        <i className="fa fa-star" />
                        <i className="fa fa-star" />
                        <i className="fa fa-star" />
                        <i className="fa fa-star-o" />
                      </div>
                    </div>
                    <div>
                      <h3 className="product-price">{formatCurrency(product.price)}</h3>
                      <span className="product-available">
                        {product.stock > 0
                          ? `Còn ${product.stock} sản phẩm`
                          : 'Tạm hết hàng'}
                      </span>
                    </div>
                    <p>{product.description || 'Chưa có mô tả cho sản phẩm này.'}</p>

                    <div className="add-to-cart product-cart-panel">
                      <div className="qty-label">
                        Số lượng
                        <div className="input-number">
                          <input
                            type="number"
                            min="1"
                            max={Math.max(1, product.stock || 1)}
                            value={quantity}
                            onChange={(event) =>
                              setQuantity(
                                Math.max(
                                  1,
                                  Math.min(
                                    Number(event.target.value || 1),
                                    Math.max(1, product.stock || 1),
                                  ),
                                ),
                              )
                            }
                          />
                        </div>
                      </div>

                      <button
                        className="add-to-cart-btn"
                        type="button"
                        disabled={product.stock <= 0}
                        onClick={() => onAddToCart(product, quantity)}
                      >
                        <i className="fa fa-shopping-cart" /> Thêm vào giỏ
                      </button>
                      <button
                        className="buy-now-detail-btn"
                        type="button"
                        disabled={product.stock <= 0}
                        onClick={() => onBuyNow(product, quantity)}
                      >
                        Mua ngay
                      </button>
                    </div>

                    <ul className="product-links">
                      <li>Danh mục:</li>
                      <li>
                        <LinkButton
                          to={buildStorePath({ categoryId: product.categoryId })}
                          onNavigate={onNavigate}
                        >
                          {product.category?.name || 'Không xác định'}
                        </LinkButton>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="section">
                <SectionHeader
                  title="Sản phẩm liên quan"
                  description="Lấy theo danh mục từ backend hiện tại"
                  onNavigate={onNavigate}
                />
                <div className="row">
                  {relatedProducts.length === 0 ? (
                    <div className="empty-state">Chưa có sản phẩm liên quan.</div>
                  ) : (
                    relatedProducts.map((item) => (
                      <ProductCard
                        key={item.id}
                        product={item}
                        onNavigate={onNavigate}
                        onAddToCart={onAddToCart}
                        onBuyNow={onBuyNow}
                      />
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

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
  const [paymentMethod, setPaymentMethod] = useState('counter')

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
                {submitting ? '\u0110ang g\u1eedi \u0111\u01a1n...' : 'Thanh to\u00e1n v\u00e0 \u0111\u1eb7t h\u00e0ng'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function OrdersPage({ auth, onNavigate }) {
  const [loading, setLoading] = useState(Boolean(auth))
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const authToken = getAuthToken(auth)

  useEffect(() => {
    if (!authToken) {
      setOrders([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadOrders() {
      setLoading(true)
      setError('')

      try {
        const response = await api.getOrders(authToken)

        if (!cancelled) {
          setOrders(Array.isArray(response) ? response : [])
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadOrders()

    return () => {
      cancelled = true
    }
  }, [authToken])

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
            <div className="orders-grid">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-card-header">
                    <h4>{'\u0110\u01a1n'} #{order.id}</h4>
                    <span className={`order-status ${order.status?.toLowerCase() || 'pending'}`}>
                      {toOrderStatusLabel(order.status)}
                    </span>
                  </div>
                  <p>
                    <strong>{'Ng\u00e0y t\u1ea1o:'}</strong> {formatDate(order.orderDate)}
                  </p>
                  <p>
                    <strong>{'\u0110\u1ecba ch\u1ec9:'}</strong> {order.shippingAddress || 'Kh\u00f4ng c\u00f3'}
                  </p>
                  <p>
                    <strong>{'T\u1ea1m t\u00ednh:'}</strong> {formatCurrency(order.originalAmount || order.totalAmount)}
                  </p>
                  {(order.discountAmount || 0) > 0 && (
                    <p>
                      <strong>{'\u01afu \u0111\u00e3i:'}</strong> -{formatCurrency(order.discountAmount)} ({order.discountPercent}%)
                    </p>
                  )}
                  <p>
                    <strong>{'T\u1ed5ng thanh to\u00e1n:'}</strong> {formatCurrency(order.totalAmount)}
                  </p>
                  <p>
                    <strong>{'Thanh to\u00e1n:'}</strong> {order.paymentMethodLabel || 'Ch\u01b0a x\u00e1c \u0111\u1ecbnh'}
                  </p>
                  <p>
                    <strong>{'Tr\u1ea1ng th\u00e1i thanh to\u00e1n:'}</strong> {order.paymentStatusLabel || 'Ch\u01b0a x\u00e1c \u0111\u1ecbnh'}
                  </p>
                  <p className="order-payment-code">
                    <strong>{'M\u00e3 thanh to\u00e1n:'}</strong> {order.paymentCode || `FW-${order.id}`}
                  </p>
                  {(order.paymentStatus || '').toLowerCase() === 'paid' && (
                    <p className="order-delivery-note">
                      {order.deliveryMessage || '\u0110\u01a1n h\u00e0ng s\u1ebd \u0111\u01b0\u1ee3c giao \u0111\u1ebfn b\u1ea1n trong v\u00f2ng 7 ng\u00e0y, vui l\u00f2ng ch\u00fa \u00fd \u0111i\u1ec7n tho\u1ea1i.'}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const EMPTY_PRODUCT_FORM = {
  name: '',
  price: '',
  stock: '',
  categoryId: '',
  imageUrl: '/electro/img/product01.png',
  description: '',
}

function ProductAdminPage({
  auth,
  categories,
  onNavigate,
  onNotify,
  onAdminProductsChanged,
}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(Boolean(auth))
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(EMPTY_PRODUCT_FORM)
  const [editingProductId, setEditingProductId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const canManageProducts = isAdmin(auth)
  const authToken = getAuthToken(auth)
  const adminTokenExpired = isExpiredToken(authToken)

  useEffect(() => {
    if (!formData.categoryId && categories.length > 0) {
      setFormData((current) => ({
        ...current,
        categoryId: String(categories[0].id),
      }))
    }
  }, [categories, formData.categoryId])

  useEffect(() => {
    if (!canManageProducts) {
      setProducts([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadProducts() {
      setLoading(true)
      setError('')

      try {
        const response = await api.getProducts({ page: 1, pageSize: 100 })

        if (!cancelled) {
          setProducts(response.items || [])
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [canManageProducts, reloadKey])

  const resetForm = () => {
    setEditingProductId(null)
    setFormData({
      ...EMPTY_PRODUCT_FORM,
      categoryId: categories[0]?.id ? String(categories[0].id) : '',
    })
  }

  const changeField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const submitProduct = async (event) => {
    event.preventDefault()

    if (!canManageProducts || !authToken) {
      setError('Bạn cần đăng nhập bằng tài khoản admin để quản lý sản phẩm.')
      return
    }

    if (adminTokenExpired) {
      setError('Phiên đăng nhập admin đã hết hạn. Hãy đăng nhập lại rồi thêm sản phẩm.')
      return
    }

    const payload = {
      name: formData.name.trim(),
      price: Number(formData.price),
      stock: Number(formData.stock),
      categoryId: Number(formData.categoryId),
      imageUrl: normalizeProductImageUrl(formData.imageUrl),
      description: formData.description.trim(),
    }

    if (!payload.name || Number.isNaN(payload.price) || Number.isNaN(payload.stock) || !payload.categoryId) {
      setError('Vui lòng nhập đầy đủ tên, giá, tồn kho và danh mục.')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (editingProductId) {
        await api.updateProduct(editingProductId, payload, authToken)
        onNotify('success', 'Đã cập nhật sản phẩm.')
      } else {
        await api.createProduct(payload, authToken)
        onNotify('success', 'Đã thêm sản phẩm mới.')
      }

      resetForm()
      setReloadKey((current) => current + 1)
      await onAdminProductsChanged()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const editProduct = (product) => {
    setEditingProductId(product.id)
    setFormData({
      name: product.name || '',
      price: String(product.price ?? ''),
      stock: String(product.stock ?? ''),
      categoryId: String(product.categoryId || product.category?.id || ''),
      imageUrl: normalizeProductImageUrl(product.imageUrl),
      description: product.description || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteProduct = async (product) => {
    if (!window.confirm(`Xóa sản phẩm "${product.name}"?`)) {
      return
    }

    if (!authToken || adminTokenExpired) {
      setError('Phiên đăng nhập admin đã hết hạn. Hãy đăng nhập lại rồi xóa sản phẩm.')
      return
    }

    setDeletingId(product.id)
    setError('')

    try {
      await api.deleteProduct(product.id, authToken)
      onNotify('success', 'Đã xóa sản phẩm.')
      setReloadKey((current) => current + 1)
      await onAdminProductsChanged()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setDeletingId(null)
    }
  }

  const getCategoryName = (product) =>
    product.category?.name ||
    categories.find((category) => category.id === product.categoryId)?.name ||
    'Không xác định'

  return (
    <>
      <div id="breadcrumb" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h3 className="breadcrumb-header">Quản trị sản phẩm</h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chủ
                  </LinkButton>
                </li>
                <li className="active">Thêm, sửa, xóa sản phẩm</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          {!auth ? (
            <div className="empty-state">
              Bạn cần đăng nhập tài khoản admin để quản lý sản phẩm.
              <div className="empty-actions">
                <LinkButton to="/login?redirect=/admin/products" className="primary-btn" onNavigate={onNavigate}>
                  Đăng nhập admin
                </LinkButton>
              </div>
            </div>
          ) : adminTokenExpired ? (
            <div className="empty-state error-state">
              Phiên đăng nhập admin đã hết hạn. Hãy đăng nhập lại để thêm, sửa, xóa sản phẩm.
              <div className="empty-actions">
                <LinkButton to="/login?redirect=/admin/products" className="primary-btn" onNavigate={onNavigate}>
                  Đăng nhập lại
                </LinkButton>
              </div>
            </div>
          ) : !canManageProducts ? (
            <div className="empty-state error-state">
              Tài khoản hiện tại không có quyền admin nên không thể thêm, sửa, xóa sản phẩm.
            </div>
          ) : (
            <div className="admin-products-layout">
              <form className="admin-product-form-card" onSubmit={submitProduct}>
                <div className="section-title">
                  <h3 className="title">
                    {editingProductId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
                  </h3>
                </div>

                {error && <div className="error-banner">{error}</div>}

                <input
                  className="input"
                  placeholder="Tên sản phẩm"
                  value={formData.name}
                  onChange={(event) => changeField('name', event.target.value)}
                  required
                />
                <div className="admin-form-grid">
                  <input
                    className="input"
                    min="0"
                    placeholder="Giá"
                    type="number"
                    value={formData.price}
                    onChange={(event) => changeField('price', event.target.value)}
                    required
                  />
                  <input
                    className="input"
                    min="0"
                    placeholder="Tồn kho"
                    type="number"
                    value={formData.stock}
                    onChange={(event) => changeField('stock', event.target.value)}
                    required
                  />
                </div>
                <select
                  className="input-select admin-select"
                  value={formData.categoryId}
                  onChange={(event) => changeField('categoryId', event.target.value)}
                  required
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input
                  className="input"
                  placeholder="Ảnh, ví dụ: macbookneo.png hoặc /electro/img/product01.png"
                  value={formData.imageUrl}
                  onChange={(event) => changeField('imageUrl', event.target.value)}
                />
                <textarea
                  className="input"
                  placeholder="Mô tả sản phẩm"
                  rows="4"
                  value={formData.description}
                  onChange={(event) => changeField('description', event.target.value)}
                />

                <div className="admin-form-actions">
                  <button className="primary-btn" type="submit" disabled={saving || categories.length === 0}>
                    {saving
                      ? 'Đang lưu...'
                      : editingProductId
                        ? 'Cập nhật'
                        : 'Thêm sản phẩm'}
                  </button>
                  {editingProductId && (
                    <button className="secondary-btn" type="button" onClick={resetForm}>
                      Hủy sửa
                    </button>
                  )}
                </div>
              </form>

              <div className="admin-product-table-card">
                <div className="section-title">
                  <h3 className="title">Danh sách sản phẩm</h3>
                </div>

                {loading ? (
                  <div className="empty-state">Đang tải sản phẩm...</div>
                ) : products.length === 0 ? (
                  <div className="empty-state">Chưa có sản phẩm nào.</div>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-products-table">
                      <thead>
                        <tr>
                          <th>Sản phẩm</th>
                          <th>Danh mục</th>
                          <th>Giá</th>
                          <th>Tồn kho</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => (
                          <tr key={product.id}>
                            <td>
                              <div className="admin-product-cell">
                                <img src={getProductImage(product)} alt={product.name} />
                                <div>
                                  <strong>{product.name}</strong>
                                  <span>{product.description || 'Chưa có mô tả'}</span>
                                </div>
                              </div>
                            </td>
                            <td>{getCategoryName(product)}</td>
                            <td>{formatCurrency(product.price)}</td>
                            <td>{product.stock}</td>
                            <td>
                              <div className="admin-row-actions">
                                <button className="secondary-btn" type="button" onClick={() => editProduct(product)}>
                                  Sửa
                                </button>
                                <button
                                  className="danger-btn"
                                  type="button"
                                  disabled={deletingId === product.id}
                                  onClick={() => deleteProduct(product)}
                                >
                                  {deletingId === product.id ? 'Đang xóa...' : 'Xóa'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function AuthPage({ auth, onNavigate, onLogin, onRegister, onLogout, onUpdateProfile, route }) {
  const [mode, setMode] = useState(route.query.mode === 'register' ? 'register' : 'login')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
  })
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
  })
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [profileSubmitting, setProfileSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [profileError, setProfileError] = useState('')
  const isPasswordSection = route.query.section === 'password'

  useEffect(() => {
    setMode(route.query.mode === 'register' ? 'register' : 'login')
  }, [route.query.mode])

  useEffect(() => {
    if (!auth) {
      return
    }

    setProfileData({
      name: auth.name || auth.Name || '',
      email: auth.email || auth.Email || '',
      phone: auth.phone || auth.Phone || '',
    })
  }, [auth])

  const redirectPath = route.query.redirect || '/orders'

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (mode === 'register') {
        await onRegister({
          username: formData.username.trim(),
          password: formData.password.trim(),
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        })
      } else {
        await onLogin(formData.username.trim(), formData.password.trim())
      }

      onNavigate(redirectPath)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitProfile = async (event) => {
    event.preventDefault()
    setProfileSubmitting(true)
    setProfileError('')

    try {
      await onUpdateProfile({
        name: profileData.name.trim(),
        email: profileData.email.trim(),
        phone: profileData.phone.trim(),
      })
    } catch (requestError) {
      setProfileError(requestError.message)
    } finally {
      setProfileSubmitting(false)
    }
  }

  const submitPassword = async (event) => {
    event.preventDefault()
    setProfileSubmitting(true)
    setProfileError('')

    try {
      const password = passwordData.password.trim()
      const confirmPassword = passwordData.confirmPassword.trim()

      if (password.length < 6) {
        throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.')
      }

      if (password !== confirmPassword) {
        throw new Error('Xác nhận mật khẩu không khớp.')
      }

      await onUpdateProfile({ password })
      setPasswordData({ password: '', confirmPassword: '' })
    } catch (requestError) {
      setProfileError(requestError.message)
    } finally {
      setProfileSubmitting(false)
    }
  }

  if (auth) {
    return (
      <>
        <div id="breadcrumb" className="section account-breadcrumb">
          <div className="container">
            <div className="row">
              <div className="col-md-12">
                <h3 className="breadcrumb-header">Thông tin cá nhân</h3>
                <ul className="breadcrumb-tree">
                  <li>
                    <LinkButton to="/" onNavigate={onNavigate}>
                      Trang chủ
                    </LinkButton>
                  </li>
                  <li className="active">Thông tin cá nhân</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="container">
            <div className="profile-panel">
              <div className="profile-title">
                <i className="fa fa-id-card" />
                <span>{isPasswordSection ? 'Đổi mật khẩu' : 'Thông tin cá nhân'}</span>
              </div>

              <form className="profile-form" onSubmit={isPasswordSection ? submitPassword : submitProfile}>
                {profileError && <div className="error-banner">{profileError}</div>}

                {isPasswordSection ? (
                  <>
                    <div className="profile-row">
                      <label>Tên đăng nhập</label>
                      <input
                        className="input profile-input"
                        value={auth.username || auth.Username || ''}
                        disabled
                      />
                    </div>

                    <div className="profile-row">
                      <label>Mật khẩu mới</label>
                      <input
                        className="input profile-input"
                        placeholder="Nhập mật khẩu mới"
                        type="password"
                        value={passwordData.password}
                        onChange={(event) =>
                          setPasswordData((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="profile-row">
                      <label>Xác nhận mật khẩu</label>
                      <input
                        className="input profile-input"
                        placeholder="Nhập lại mật khẩu mới"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(event) =>
                          setPasswordData((current) => ({
                            ...current,
                            confirmPassword: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="profile-row profile-avatar-row">
                      <label>Ảnh đại diện</label>
                      <div className="profile-avatar-block">
                        <div className="profile-avatar">
                          {(auth.name || auth.Name || auth.username || auth.Username || 'U').charAt(0).toUpperCase()}
                          <button className="profile-avatar-edit" type="button" aria-label="Đổi ảnh đại diện">
                            <i className="fa fa-pencil" />
                          </button>
                        </div>
                        <span>Tải file có định dạng: png, jpg, jpeg.</span>
                      </div>
                    </div>

                    <div className="profile-row">
                      <label>Tên đăng nhập</label>
                      <input
                        className="input profile-input"
                        value={auth.username || auth.Username || ''}
                        disabled
                      />
                    </div>

                    <div className="profile-row">
                      <label>Họ và tên</label>
                      <input
                        className="input profile-input"
                        placeholder="Họ và tên"
                        value={profileData.name}
                        onChange={(event) =>
                          setProfileData((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="profile-row">
                      <label>Email</label>
                      <input
                        className="input profile-input"
                        placeholder="Email"
                        type="email"
                        value={profileData.email}
                        onChange={(event) =>
                          setProfileData((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="profile-row">
                      <label>Số điện thoại</label>
                      <input
                        className="input profile-input"
                        placeholder="Số điện thoại"
                        value={profileData.phone}
                        onChange={(event) =>
                          setProfileData((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                )}

                <div className="profile-actions">
                  <button className="primary-btn" type="submit" disabled={profileSubmitting}>
                    {profileSubmitting
                      ? 'Đang cập nhật...'
                      : isPasswordSection
                        ? 'Đổi mật khẩu'
                        : 'Cập nhật'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div id="breadcrumb" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h3 className="breadcrumb-header">
                {mode === 'register' ? 'Đăng ký tài khoản' : 'Đăng nhập'}
              </h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chủ
                  </LinkButton>
                </li>
                <li className="active">
                  {mode === 'register' ? 'Đăng ký' : 'Đăng nhập'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="auth-layout">
            <div className="auth-card">
              <div className="auth-tabs">
                <button
                  className={mode === 'login' ? 'active' : ''}
                  type="button"
                  onClick={() => setMode('login')}
                >
                  Đăng nhập
                </button>
                <button
                  className={mode === 'register' ? 'active' : ''}
                  type="button"
                  onClick={() => setMode('register')}
                >
                  Đăng ký
                </button>
              </div>

              <form className="auth-form" onSubmit={submit}>
                {error && <div className="error-banner">{error}</div>}

                {mode === 'register' && (
                  <>
                    <input
                      className="input"
                      placeholder="Họ tên"
                      value={formData.name}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="input"
                      placeholder="Email"
                      type="email"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="input"
                      placeholder="Số điện thoại"
                      value={formData.phone}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </>
                )}

                <input
                  className="input"
                  placeholder="Tên đăng nhập"
                  value={formData.username}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      username: event.target.value,
                    }))
                  }
                  required
                />
                <input
                  className="input"
                  placeholder="Mật khẩu"
                  type="password"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  required
                />

                <button className="primary-btn auth-submit" type="submit" disabled={submitting}>
                  {submitting
                    ? 'Đang xử lý...'
                    : mode === 'register'
                      ? 'Tạo tài khoản'
                      : 'Đăng nhập'}
                </button>
              </form>
            </div>

            <div className="auth-side-note">
              <h4>Tích hợp FW</h4>
              <p>
                Đăng nhập dùng endpoint `/api/auth/login`, đăng ký dùng
                `/api/auth/register`, và sau khi đăng nhập token sẽ được dùng cho
                `/api/orders`.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function NotFoundPage({ onNavigate }) {
  return (
    <div className="section">
      <div className="container">
        <div className="empty-state">
          Trang bạn truy cập không tồn tại trong storefront này.
          <div className="empty-actions">
            <LinkButton to="/" className="primary-btn" onNavigate={onNavigate}>
              Về trang chủ
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [route, setRoute] = useState(parseRoute)
  const [auth, setAuth] = useState(() => readStorage(STORAGE_KEYS.auth, null))
  const [cart, setCart] = useState(() => readStorage(STORAGE_KEYS.cart, []))
  const [categories, setCategories] = useState([])
  const [highlightedProducts, setHighlightedProducts] = useState([])
  const [loadingHomeData, setLoadingHomeData] = useState(true)
  const [notice, setNotice] = useState(null)
  const [placingOrder, setPlacingOrder] = useState(false)
  const noticeTimeoutRef = useRef(null)

  useEffect(() => {
    writeStorage(STORAGE_KEYS.cart, cart)
  }, [cart])

  useEffect(() => {
    if (auth) {
      writeStorage(STORAGE_KEYS.auth, auth)
    } else {
      localStorage.removeItem(STORAGE_KEYS.auth)
    }
  }, [auth])

  useEffect(() => {
    const syncRoute = () => {
      startTransition(() => setRoute(parseRoute()))
    }

    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  function openNotice(type, message) {
    setNotice({ type, message })
    window.clearTimeout(noticeTimeoutRef.current)
    noticeTimeoutRef.current = window.setTimeout(() => setNotice(null), 3200)
  }

  useEffect(() => {
    return () => window.clearTimeout(noticeTimeoutRef.current)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadShellData() {
      setLoadingHomeData(true)

      try {
        const [categoryData, productData] = await Promise.all([
          api.getCategories(),
          api.getProducts({ page: 1, pageSize: 12 }),
        ])

        if (cancelled) {
          return
        }

        setCategories(Array.isArray(categoryData) ? categoryData : [])
        setHighlightedProducts(productData.items || [])
      } catch {
        if (!cancelled) {
          setCategories([])
          setHighlightedProducts([])
        }
      } finally {
        if (!cancelled) {
          setLoadingHomeData(false)
        }
      }
    }

    loadShellData()

    return () => {
      cancelled = true
    }
  }, [])

  async function refreshShellData() {
    try {
      const [categoryData, productData] = await Promise.all([
        api.getCategories(),
        api.getProducts({ page: 1, pageSize: 12 }),
      ])

      setCategories(Array.isArray(categoryData) ? categoryData : [])
      setHighlightedProducts(productData.items || [])
    } catch (requestError) {
      openNotice('error', requestError.message)
    }
  }

  function navigate(path) {
    if (`${window.location.pathname}${window.location.search}` === path) {
      return
    }

    window.history.pushState({}, '', path)

    const currentPathname = window.location.pathname
    const targetPathname = new URL(path, window.location.origin).pathname
    if (currentPathname !== targetPathname) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    startTransition(() => setRoute(parseRoute()))
  }

  function upsertCart(product, quantity) {
    const safeQuantity = Math.max(1, Number(quantity || 1))

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + safeQuantity,
                  Math.max(1, product.stock || item.quantity + safeQuantity),
                ),
              }
            : item,
        )
      }

      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: Math.min(safeQuantity, Math.max(1, product.stock || safeQuantity)),
          imageUrl: product.imageUrl,
          stock: product.stock,
          categoryId: product.categoryId,
        },
      ]
    })

    openNotice('success', `Đã thêm "${product.name}" vào giỏ hàng.`)
  }

  function buyNow(product, quantity) {
    upsertCart(product, quantity)
    navigate('/checkout')
  }

  function removeCartItem(productId) {
    setCart((current) => current.filter((item) => item.id !== productId))
    openNotice('success', 'Đã xóa sản phẩm khỏi giỏ hàng.')
  }

  async function login(username, password) {
    const data = await api.login(username, password)
    setAuth(data)
    openNotice('success', 'Đăng nhập thành công.')
  }

  async function register(payload) {
    const normalizedPayload = {
      username: payload.username.trim(),
      password: payload.password.trim(),
      name: payload.name?.trim() || '',
      email: payload.email?.trim() || '',
      phone: payload.phone?.trim() || '',
    }

    await api.register(normalizedPayload)
    await login(normalizedPayload.username, normalizedPayload.password)
    openNotice('success', 'Tạo tài khoản thành công.')
  }

  async function updateProfile(payload) {
    const authToken = getAuthToken(auth)
    const userId = getAuthUserId(auth)

    if (!authToken || !userId) {
      throw new Error('Không tìm thấy phiên đăng nhập. Hãy đăng nhập lại.')
    }

    const updatedUser = await api.updateUser(userId, payload, authToken)
    setAuth((current) => ({
      ...current,
      name: updatedUser.name || updatedUser.Name || payload.name || current?.name || current?.Name,
      Name: updatedUser.name || updatedUser.Name || payload.name || current?.Name || current?.name,
      email: updatedUser.email || updatedUser.Email || payload.email || current?.email || current?.Email,
      Email: updatedUser.email || updatedUser.Email || payload.email || current?.Email || current?.email,
      phone: updatedUser.phone || updatedUser.Phone || payload.phone || current?.phone || current?.Phone,
      Phone: updatedUser.phone || updatedUser.Phone || payload.phone || current?.Phone || current?.phone,
    }))
    openNotice('success', payload.password ? 'Đã đổi mật khẩu.' : 'Đã cập nhật thông tin tài khoản.')
  }

  function logout() {
    setAuth(null)
    openNotice('success', 'Đã đăng xuất tài khoản.')
  }

  async function placeOrder(shippingAddress, paymentMethod) {
    const authToken = getAuthToken(auth)

    if (!authToken) {
      navigate('/login?redirect=/checkout')
      return
    }

    if (isExpiredToken(authToken)) {
      openNotice('error', 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại trước khi đặt hàng.')
      navigate('/login?redirect=/checkout')
      return
    }

    if (!shippingAddress.trim()) {
      openNotice('error', 'Vui lòng nhập địa chỉ giao hàng.')
      return
    }

    setPlacingOrder(true)

    try {
      const productChecks = await Promise.allSettled(
        cart.map((item) => api.getProduct(item.id)),
      )
      const invalidItems = cart.filter((item, index) => {
        const result = productChecks[index]

        if (result.status !== 'fulfilled') {
          return true
        }

        const latestProduct = result.value
        return (
          !latestProduct ||
          latestProduct.name !== item.name ||
          latestProduct.stock < item.quantity
        )
      })

      if (invalidItems.length > 0) {
        const invalidIds = new Set(invalidItems.map((item) => item.id))

        setCart((current) => current.filter((item) => !invalidIds.has(item.id)))
        openNotice(
          'error',
          'Giỏ hàng có sản phẩm đã thay đổi hoặc không đủ tồn kho. Tôi đã xóa sản phẩm lỗi, vui lòng kiểm tra lại giỏ hàng.',
        )
        return
      }

      const payload = {
        shippingAddress,
        paymentMethod,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      }

      const createdOrder = await api.createOrder(payload, authToken)
      setCart([])
      openNotice('success', createdOrder?.message || '\u0110\u1eb7t h\u00e0ng th\u00e0nh c\u00f4ng.')
      navigate('/orders')
    } catch (requestError) {
      openNotice('error', requestError.message)
    } finally {
      setPlacingOrder(false)
    }
  }

  const cartSummary = {
    count: cart.reduce((sum, item) => sum + item.quantity, 0),
    total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
  }

  let content = null

  if (loadingHomeData && (route.name === 'home' || route.name === 'store')) {
    content = (
      <div className="section">
        <div className="container">
          <div className="empty-state">Đang đồng bộ dữ liệu từ hệ thống FW...</div>
        </div>
      </div>
    )
  } else {
    switch (route.name) {
      case 'home':
        content = (
          <HomePage
            categories={categories}
            highlightedProducts={highlightedProducts}
            onNavigate={navigate}
            onAddToCart={upsertCart}
            onBuyNow={buyNow}
          />
        )
        break
      case 'store':
        content = (
          <StorePage
            categories={categories}
            route={route}
            onNavigate={navigate}
            onAddToCart={upsertCart}
            onBuyNow={buyNow}
          />
        )
        break
      case 'product':
        content = (
          <ProductPage
            productId={route.params.id}
            onNavigate={navigate}
            onAddToCart={upsertCart}
            onBuyNow={buyNow}
          />
        )
        break
      case 'checkout':
        content = (
          <CheckoutPage
            auth={auth}
            cart={cart}
            onNavigate={navigate}
            onPlaceOrder={placeOrder}
            submitting={placingOrder}
          />
        )
        break
      case 'orders':
        content = <OrdersPage auth={auth} onNavigate={navigate} />
        break
      case 'admin':
        content = (
          <AdminApp
            auth={auth}
            route={route}
            onNavigate={navigate}
            onLogin={setAuth}
            onLogout={logout}
            onDataChanged={refreshShellData}
          />
        )
        break
      case 'login':
        content = (
          <AuthPage
            auth={auth}
            onNavigate={navigate}
            onLogin={login}
            onRegister={register}
            onLogout={logout}
            onUpdateProfile={updateProfile}
            route={route}
          />
        )
        break
      case 'account':
        content = (
          <AuthPage
            auth={auth}
            onNavigate={navigate}
            onLogin={login}
            onRegister={register}
            onLogout={logout}
            onUpdateProfile={updateProfile}
            route={route}
          />
        )
        break
      default:
        content = <NotFoundPage onNavigate={navigate} />
    }
  }

  return (
    <div className="app-shell">
      <Header
        key={`${route.pathname}?keyword=${route.query.keyword || ''}&categoryId=${route.query.categoryId || ''}`}
        auth={auth}
        cart={cart}
        categories={categories}
        route={route}
        onNavigate={navigate}
        onLogout={logout}
        onRemoveCartItem={removeCartItem}
      />

      {notice && (
        <div className={`status-banner ${notice.type}`}>
          <div className="container">{notice.message}</div>
        </div>
      )}

      {content}

      <Footer />

      <button
        className="floating-cart"
        type="button"
        onClick={() => navigate('/checkout')}
      >
        <i className="fa fa-shopping-cart" />
        <span>{cartSummary.count}</span>
        <strong>{formatCurrency(cartSummary.total)}</strong>
      </button>
    </div>
  )
}

export default App
