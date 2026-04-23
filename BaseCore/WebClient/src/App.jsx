import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react'

const FALLBACK_IMAGES = [
  '/electro/img/product01.png',
  '/electro/img/product02.png',
  '/electro/img/product03.png',
  '/electro/img/product04.png',
  '/electro/img/product05.png',
  '/electro/img/product06.png',
  '/electro/img/product07.png',
  '/electro/img/product08.png',
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

function getProductImage(product) {
  const imageUrl = product?.imageUrl?.trim()

  if (imageUrl) {
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl
    }

    if (imageUrl.startsWith('/')) {
      return imageUrl
    }

    if (imageUrl.startsWith('img/')) {
      return `/${imageUrl}`
    }

    return `/electro/img/${imageUrl}`
  }

  const fallbackIndex = Number(product?.id || 0) % FALLBACK_IMAGES.length
  return FALLBACK_IMAGES[fallbackIndex]
}

function toOrderStatusLabel(status) {
  switch ((status || '').toLowerCase()) {
    case 'completed':
      return 'Hoàn tất'
    case 'cancelled':
      return 'Đã hủy'
    default:
      return 'Đang xử lý'
  }
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
      'Khong ket noi duoc backend. Hay chay BaseCore.APIService o cong 5001 va BaseCore.AuthService o cong 5002.',
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
    const message =
      (typeof data === 'object' && data?.message) ||
      (typeof data === 'string' && data) ||
      'Backend dang tra loi loi. Kiem tra lai API/gateway va du lieu SQL Server.'
    throw new Error(message)
  }

  return data
}

const api = {
  getCategories: () => request('/categories'),
  getProducts: (params = {}) =>
    request(`/products?${new URLSearchParams(params).toString()}`),
  getProduct: (id) => request(`/products/${id}`),
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

  useEffect(() => {
    setKeyword(route.query.keyword || '')
    setCategoryId(route.query.categoryId || '')
  }, [route.pathname, route.query.categoryId, route.query.keyword])

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )
  const featuredCategories = categories.slice(0, 4)

  const submitSearch = (event) => {
    event.preventDefault()
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
                  <i className="fa fa-phone" /> 0900 000 000
                </a>
              </li>
              <li>
                <a href="mailto:support@basecore.vn">
                  <i className="fa fa-envelope-o" /> support@basecore.vn
                </a>
              </li>
              <li>
                <a href="https://maps.google.com" target="_blank" rel="noreferrer">
                  <i className="fa fa-map-marker" /> Ho Chi Minh City
                </a>
              </li>
            </ul>
            <ul className="header-links pull-right">
              <li>
                <button className="header-link-button" type="button">
                  <i className="fa fa-dollar" /> VND
                </button>
              </li>
              <li>
                {auth ? (
                  <button className="header-link-button" type="button" onClick={onLogout}>
                    <i className="fa fa-user-o" /> {auth.name || auth.username}
                  </button>
                ) : (
                  <LinkButton to="/login" className="header-link-button" onNavigate={onNavigate}>
                    <i className="fa fa-user-o" /> Dang nhap
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
                      <option value="">Tat ca danh muc</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      placeholder="Tim san pham, mo ta, danh muc..."
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                    />
                    <button className="search-btn" type="submit">
                      Tim kiem
                    </button>
                  </form>
                </div>
              </div>

              <div className="col-md-3 clearfix">
                <div className="header-ctn">
                  <div>
                    <LinkButton to="/orders" onNavigate={onNavigate}>
                      <i className="fa fa-list-alt" />
                      <span>Don cua toi</span>
                      {auth && <div className="qty">1</div>}
                    </LinkButton>
                  </div>

                  <div className="dropdown">
                    <a className="dropdown-toggle" aria-expanded="true" href="#cart-dropdown">
                      <i className="fa fa-shopping-cart" />
                      <span>Gio hang</span>
                      <div className="qty">{cartCount}</div>
                    </a>
                    <div className="cart-dropdown" id="cart-dropdown">
                      <div className="cart-list">
                        {cart.length === 0 ? (
                          <div className="empty-dropdown">Chua co san pham trong gio.</div>
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
                        <small>{cartCount} san pham da chon</small>
                        <h5>TAM TINH: {formatCurrency(cartTotal)}</h5>
                      </div>
                      <div className="cart-btns">
                        <LinkButton to="/store" onNavigate={onNavigate}>
                          Tiep tuc mua
                        </LinkButton>
                        <LinkButton to="/checkout" onNavigate={onNavigate}>
                          Thanh toan <i className="fa fa-arrow-circle-right" />
                        </LinkButton>
                      </div>
                    </div>
                  </div>

                  <div className="menu-toggle">
                    <LinkButton to="/store" onNavigate={onNavigate}>
                      <i className="fa fa-bars" />
                      <span>Danh muc</span>
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
                  Trang chu
                </LinkButton>
              </li>
              <li className={route.name === 'store' ? 'active' : ''}>
                <LinkButton to="/store" onNavigate={onNavigate}>
                  Cua hang
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
                  Don hang
                </LinkButton>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  )
}

function Footer() {
  return (
    <footer id="footer">
      <div className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-4 col-xs-6">
              <div className="footer">
                <h3 className="footer-title">Ve he thong</h3>
                <p>
                  Storefront nay duoc ket noi truc tiep vao microservice gateway
                  cua FW, su dung giao dien Electro cho phan mua hang.
                </p>
                <ul className="footer-links">
                  <li>
                    <a href="https://maps.google.com" target="_blank" rel="noreferrer">
                      <i className="fa fa-map-marker" /> Ho Chi Minh City
                    </a>
                  </li>
                  <li>
                    <a href="tel:+84000000000">
                      <i className="fa fa-phone" /> 0900 000 000
                    </a>
                  </li>
                  <li>
                    <a href="mailto:support@basecore.vn">
                      <i className="fa fa-envelope-o" /> support@basecore.vn
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-md-2 col-xs-6">
              <div className="footer">
                <h3 className="footer-title">Chuc nang</h3>
                <ul className="footer-links">
                  <li>
                    <a href="/store">Danh muc san pham</a>
                  </li>
                  <li>
                    <a href="/checkout">Thanh toan</a>
                  </li>
                  <li>
                    <a href="/orders">Theo doi don</a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="clearfix visible-xs" />

            <div className="col-md-3 col-xs-6">
              <div className="footer">
                <h3 className="footer-title">Cong nghe</h3>
                <ul className="footer-links">
                  <li>
                    <span>React 19 + Vite</span>
                  </li>
                  <li>
                    <span>Gateway Ocelot</span>
                  </li>
                  <li>
                    <span>Auth JWT</span>
                  </li>
                  <li>
                    <span>Product + Order API</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-md-3 col-xs-6">
              <div className="footer">
                <h3 className="footer-title">Trang thai</h3>
                <p className="footer-note">
                  Giao dien Electro da duoc dua vao `WebClient` de hoan thien
                  phan mua hang, trong khi `BaseCore.WebClient` co the tiep tuc
                  dung cho admin.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

function ProductCard({ product, onNavigate, onAddToCart }) {
  return (
    <div className="col-md-4 col-xs-6" key={product.id}>
      <div className="product">
        <div className="product-img">
          <img src={getProductImage(product)} alt={product.name} />
          <div className="product-label">
            {product.stock < 5 && <span className="sale">Sap het</span>}
            <span className="new">Moi</span>
          </div>
        </div>
        <div className="product-body">
          <p className="product-category">{product.category?.name || 'San pham'}</p>
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
              <span className="tooltipp">Xem chi tiet</span>
            </button>
            <button
              className="quick-view"
              type="button"
              onClick={() => onAddToCart(product, 1)}
            >
              <i className="fa fa-shopping-bag" />
              <span className="tooltipp">Them vao gio</span>
            </button>
          </div>
        </div>
        <div className="add-to-cart">
          <button className="add-to-cart-btn" type="button" onClick={() => onAddToCart(product, 1)}>
            <i className="fa fa-shopping-cart" /> Them vao gio
          </button>
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
                    Shop now <i className="fa fa-arrow-circle-right" />
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
            Xem tat ca
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
}) {
  const featuredProducts = highlightedProducts.slice(0, 8)
  const topSellingProducts = highlightedProducts.slice(0, 4)

  return (
    <>
      <HeroShops categories={categories} onNavigate={onNavigate} />

      <div className="section">
        <div className="container">
          <SectionHeader
            title="San pham noi bat"
            description="Lay du lieu truc tiep tu FW API Gateway"
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
                      <span>Gio</span>
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
                <h2 className="text-uppercase">Giao dien Electro + backend FW</h2>
                <p>Storefront da san sang cho luong dat hang va tai khoan</p>
                <LinkButton to="/checkout" className="primary-btn cta-btn" onNavigate={onNavigate}>
                  Di den checkout
                </LinkButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <SectionHeader
            title="Ban chay"
            description="Nhung san pham moi cap nhat trong he thong"
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
                    <p className="product-category">{product.category?.name || 'San pham'}</p>
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

function StorePage({ categories, route, onNavigate, onAddToCart }) {
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
              <h3 className="breadcrumb-header">Cua hang</h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chu
                  </LinkButton>
                </li>
                <li className="active">Danh sach san pham</li>
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
                <h3 className="aside-title">Danh muc</h3>
                <div className="checkbox-filter category-filter-list">
                  <div className="input-checkbox">
                    <label className={!categoryId ? 'is-selected' : ''}>
                      <LinkButton
                        to={buildStorePath({ keyword })}
                        onNavigate={onNavigate}
                      >
                        Tat ca san pham
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
                <h3 className="aside-title">Thong tin bo loc</h3>
                <div className="category-filter-note">
                  <p>
                    Tu khoa: <strong>{keyword || 'Khong co'}</strong>
                  </p>
                  <p>
                    Tong ket qua: <strong>{totalCount}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div id="store" className="col-md-9">
              <div className="store-filter clearfix">
                <div className="store-sort">
                  <label>
                    Trang hien tai:
                    <span className="input-select inline-note">{currentPage}</span>
                  </label>
                </div>
                <div className="store-grid">
                  <span className="store-qty">{totalCount} san pham</span>
                </div>
              </div>

              {loading ? (
                <div className="empty-state">Dang tai du lieu san pham...</div>
              ) : error ? (
                <div className="empty-state error-state">{error}</div>
              ) : products.length === 0 ? (
                <div className="empty-state">
                  Khong tim thay san pham phu hop bo loc hien tai.
                </div>
              ) : (
                <div className="row">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onNavigate={onNavigate}
                      onAddToCart={onAddToCart}
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

function ProductPage({ productId, onNavigate, onAddToCart }) {
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
              <h3 className="breadcrumb-header">Chi tiet san pham</h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chu
                  </LinkButton>
                </li>
                <li>
                  <LinkButton to="/store" onNavigate={onNavigate}>
                    Cua hang
                  </LinkButton>
                </li>
                <li className="active">{product?.name || 'Dang tai'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          {loading ? (
            <div className="empty-state">Dang tai chi tiet san pham...</div>
          ) : error || !product ? (
            <div className="empty-state error-state">{error || 'Khong tim thay san pham.'}</div>
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
                          ? `Con ${product.stock} san pham`
                          : 'Tam het hang'}
                      </span>
                    </div>
                    <p>{product.description || 'Chua co mo ta cho san pham nay.'}</p>

                    <div className="add-to-cart product-cart-panel">
                      <div className="qty-label">
                        So luong
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
                        <i className="fa fa-shopping-cart" /> Them vao gio
                      </button>
                    </div>

                    <ul className="product-links">
                      <li>Danh muc:</li>
                      <li>
                        <LinkButton
                          to={buildStorePath({ categoryId: product.categoryId })}
                          onNavigate={onNavigate}
                        >
                          {product.category?.name || 'Khong xac dinh'}
                        </LinkButton>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="section">
                <SectionHeader
                  title="San pham lien quan"
                  description="Lay theo danh muc tu backend hien tai"
                  onNavigate={onNavigate}
                />
                <div className="row">
                  {relatedProducts.length === 0 ? (
                    <div className="empty-state">Chua co san pham lien quan.</div>
                  ) : (
                    relatedProducts.map((item) => (
                      <ProductCard
                        key={item.id}
                        product={item}
                        onNavigate={onNavigate}
                        onAddToCart={onAddToCart}
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
    '227 Nguyen Van Cu, District 5, Ho Chi Minh City',
  )

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  )

  if (cart.length === 0) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty-state">
            Gio hang dang trong. Hay them san pham truoc khi thanh toan.
            <div className="empty-actions">
              <LinkButton to="/store" className="primary-btn" onNavigate={onNavigate}>
                Di den cua hang
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
              <h3 className="breadcrumb-header">Checkout</h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chu
                  </LinkButton>
                </li>
                <li className="active">Thanh toan</li>
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
                  <h3 className="title">Thong tin giao hang</h3>
                </div>
                <div className="form-group">
                  <input
                    className="input"
                    value={auth?.name || auth?.username || ''}
                    disabled
                    placeholder="Ten khach hang"
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
                    placeholder="Dia chi giao hang"
                  />
                </div>
                {!auth && (
                  <div className="order-note danger-note">
                    Ban can dang nhap de tao don hang. He thong FW yeu cau JWT token
                    cho endpoint `/api/orders`.
                    <div className="empty-actions">
                      <LinkButton
                        to="/login?redirect=/checkout"
                        className="primary-btn"
                        onNavigate={onNavigate}
                      >
                        Dang nhap ngay
                      </LinkButton>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-5 order-details">
              <div className="section-title text-center">
                <h3 className="title">Don hang cua ban</h3>
              </div>
              <div className="order-summary">
                <div className="order-col">
                  <div>
                    <strong>SAN PHAM</strong>
                  </div>
                  <div>
                    <strong>TONG</strong>
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
                  <div>Phi giao hang</div>
                  <div>
                    <strong>FREE</strong>
                  </div>
                </div>
                <div className="order-col">
                  <div>
                    <strong>TONG CONG</strong>
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
                onClick={() => onPlaceOrder(shippingAddress)}
              >
                {submitting ? 'Dang gui don...' : 'Dat hang'}
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

  useEffect(() => {
    if (!auth?.token) {
      setOrders([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadOrders() {
      setLoading(true)
      setError('')

      try {
        const response = await api.getOrders(auth.token)

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
  }, [auth])

  return (
    <>
      <div id="breadcrumb" className="section">
        <div className="container">
          <div className="row">
            <div className="col-md-12">
              <h3 className="breadcrumb-header">Don hang cua toi</h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chu
                  </LinkButton>
                </li>
                <li className="active">Don hang</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          {!auth ? (
            <div className="empty-state">
              Ban chua dang nhap nen chua the xem danh sach don hang.
              <div className="empty-actions">
                <LinkButton to="/login?redirect=/orders" className="primary-btn" onNavigate={onNavigate}>
                  Dang nhap
                </LinkButton>
              </div>
            </div>
          ) : loading ? (
            <div className="empty-state">Dang tai lich su don hang...</div>
          ) : error ? (
            <div className="empty-state error-state">{error}</div>
          ) : orders.length === 0 ? (
            <div className="empty-state">Tai khoan nay chua co don hang nao.</div>
          ) : (
            <div className="orders-grid">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-card-header">
                    <h4>Don #{order.id}</h4>
                    <span className={`order-status ${order.status?.toLowerCase() || 'pending'}`}>
                      {toOrderStatusLabel(order.status)}
                    </span>
                  </div>
                  <p>
                    <strong>Ngay tao:</strong> {formatDate(order.orderDate)}
                  </p>
                  <p>
                    <strong>Dia chi:</strong> {order.shippingAddress || 'Khong co'}
                  </p>
                  <p>
                    <strong>Tong tien:</strong> {formatCurrency(order.totalAmount)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function AuthPage({ auth, onNavigate, onLogin, onRegister, onLogout, route }) {
  const [mode, setMode] = useState(route.query.mode === 'register' ? 'register' : 'login')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setMode(route.query.mode === 'register' ? 'register' : 'login')
  }, [route.query.mode])

  const redirectPath = route.query.redirect || '/orders'

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (mode === 'register') {
        await onRegister(formData)
      } else {
        await onLogin(formData.username, formData.password)
      }

      onNavigate(redirectPath)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (auth) {
    return (
      <div className="section">
        <div className="container">
          <div className="account-card">
            <h3>Xin chao, {auth.name || auth.username}</h3>
            <p>
              Tai khoan hien tai da dang nhap. Ban co the tiep tuc checkout hoac xem
              lich su don hang.
            </p>
            <div className="empty-actions">
              <LinkButton to={redirectPath} className="primary-btn" onNavigate={onNavigate}>
                Tiep tuc
              </LinkButton>
              <button className="secondary-btn" type="button" onClick={onLogout}>
                Dang xuat
              </button>
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
              <h3 className="breadcrumb-header">
                {mode === 'register' ? 'Dang ky tai khoan' : 'Dang nhap'}
              </h3>
              <ul className="breadcrumb-tree">
                <li>
                  <LinkButton to="/" onNavigate={onNavigate}>
                    Trang chu
                  </LinkButton>
                </li>
                <li className="active">
                  {mode === 'register' ? 'Dang ky' : 'Dang nhap'}
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
                  Dang nhap
                </button>
                <button
                  className={mode === 'register' ? 'active' : ''}
                  type="button"
                  onClick={() => setMode('register')}
                >
                  Dang ky
                </button>
              </div>

              <form className="auth-form" onSubmit={submit}>
                {error && <div className="error-banner">{error}</div>}

                {mode === 'register' && (
                  <>
                    <input
                      className="input"
                      placeholder="Ho ten"
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
                      placeholder="So dien thoai"
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
                  placeholder="Ten dang nhap"
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
                  placeholder="Mat khau"
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
                    ? 'Dang xu ly...'
                    : mode === 'register'
                      ? 'Tao tai khoan'
                      : 'Dang nhap'}
                </button>
              </form>
            </div>

            <div className="auth-side-note">
              <h4>FW integration</h4>
              <p>
                Dang nhap dung endpoint `/api/auth/login`, dang ky dung
                `/api/auth/register`, va sau khi dang nhap token se duoc dung cho
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
          Trang ban truy cap khong ton tai trong storefront nay.
          <div className="empty-actions">
            <LinkButton to="/" className="primary-btn" onNavigate={onNavigate}>
              Ve trang chu
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

  const syncRoute = useEffectEvent(() => {
    startTransition(() => setRoute(parseRoute()))
  })

  useEffect(() => {
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [syncRoute])

  const openNotice = useEffectEvent((type, message) => {
    setNotice({ type, message })
    window.clearTimeout(noticeTimeoutRef.current)
    noticeTimeoutRef.current = window.setTimeout(() => setNotice(null), 3200)
  })

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

  function navigate(path) {
    if (`${window.location.pathname}${window.location.search}` === path) {
      return
    }

    window.history.pushState({}, '', path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

    openNotice('success', `Da them "${product.name}" vao gio hang.`)
  }

  function removeCartItem(productId) {
    setCart((current) => current.filter((item) => item.id !== productId))
    openNotice('success', 'Da xoa san pham khoi gio hang.')
  }

  async function login(username, password) {
    const data = await api.login(username, password)
    setAuth(data)
    openNotice('success', 'Dang nhap thanh cong.')
  }

  async function register(payload) {
    await api.register(payload)
    await login(payload.username, payload.password)
    openNotice('success', 'Tao tai khoan thanh cong.')
  }

  function logout() {
    setAuth(null)
    openNotice('success', 'Da dang xuat tai khoan.')
  }

  async function placeOrder(shippingAddress) {
    if (!auth?.token) {
      navigate('/login?redirect=/checkout')
      return
    }

    if (!shippingAddress.trim()) {
      openNotice('error', 'Vui long nhap dia chi giao hang.')
      return
    }

    setPlacingOrder(true)

    try {
      const payload = {
        shippingAddress,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      }

      await api.createOrder(payload, auth.token)
      setCart([])
      openNotice('success', 'Da tao don hang thanh cong.')
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
          <div className="empty-state">Dang dong bo du lieu tu he thong FW...</div>
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
          />
        )
        break
      case 'product':
        content = (
          <ProductPage
            productId={route.params.id}
            onNavigate={navigate}
            onAddToCart={upsertCart}
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
      case 'login':
        content = (
          <AuthPage
            auth={auth}
            onNavigate={navigate}
            onLogin={login}
            onRegister={register}
            onLogout={logout}
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
