import { useEffect, useMemo, useState } from 'react'
import './admin.css'

const ADMIN_TOKEN_KEY = 'electro-store-auth'
const ORDER_REFRESH_INTERVAL_MS = 5000

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
})

function getToken(auth) {
  return auth?.token || auth?.Token || ''
}

function getRole(auth) {
  return String(auth?.role || auth?.Role || '').toLowerCase()
}

function isAdmin(auth) {
  return getRole(auth) === 'admin'
}

function getName(auth) {
  return auth?.name || auth?.Name || auth?.username || auth?.Username || 'Admin'
}

function getEmail(auth) {
  return auth?.email || auth?.Email || ''
}

function getMessage(data, response) {
  if (response.status === 401) {
    return 'Session expired or token is invalid.'
  }

  if (response.status === 403) {
    return 'This account does not have admin permission.'
  }

  if (data?.message) {
    return data.message
  }

  if (data?.title) {
    return data.title
  }

  return `Request failed with status ${response.status}.`
}

async function request(path, options = {}) {
  const { token, ...rest } = options
  let response

  try {
    response = await fetch(`/api${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(rest.headers || {}),
      },
      ...rest,
    })
  } catch {
    throw new Error('Cannot connect to backend. Run APIService, AuthService, or ApiGateway first.')
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
    throw new Error(getMessage(data, response))
  }

  return data
}

function toQuery(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  return searchParams.toString()
}

const adminApi = {
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  getProducts: (params = {}) => request(`/products?${toQuery(params)}`),
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
  getCategories: () => request('/categories'),
  createCategory: (payload, token) =>
    request('/categories', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  updateCategory: (id, payload, token) =>
    request(`/categories/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),
  deleteCategory: (id, token) =>
    request(`/categories/${id}`, {
      method: 'DELETE',
      token,
    }),
  getUsers: (params = {}, token) => request(`/users?${toQuery(params)}`, { token }),
  getOrders: (token) => request('/orders/all', { token }),
  confirmOrder: (id, token) =>
    request(`/orders/${id}/admin/confirm`, {
      method: 'PUT',
      token,
    }),
  shipOrder: (id, token) =>
    request(`/orders/${id}/admin/ship`, {
      method: 'PUT',
      token,
    }),
  createUser: (payload, token) =>
    request('/users', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  updateUser: (id, payload, token) =>
    request(`/users/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),
  deleteUser: (id, token) =>
    request(`/users/${id}`, {
      method: 'DELETE',
      token,
    }),
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
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

function getOrderStatusLabel(order) {
  if (order?.statusLabel) {
    return order.statusLabel
  }

  switch ((order?.status || '').toLowerCase()) {
    case 'pending':
      return 'Chờ xác nhận'
    case 'confirmed':
      return 'Đã xác nhận'
    case 'shipping':
      return 'Đang giao'
    case 'completed':
      return 'Đã nhận'
    case 'cancelled':
      return 'Đã hủy'
    default:
      return 'Chưa xác định'
  }
}

function getOrderStatusBadge(status) {
  switch ((status || '').toLowerCase()) {
    case 'pending':
      return 'warning'
    case 'confirmed':
      return 'info'
    case 'shipping':
      return 'primary'
    case 'completed':
      return 'success'
    case 'cancelled':
      return 'danger'
    default:
      return 'secondary'
  }
}

function normalizeProductList(data) {
  if (Array.isArray(data)) {
    return { items: data, totalCount: data.length, totalPages: 1 }
  }

  return {
    items: data?.items || data?.data || [],
    totalCount: data?.totalCount || data?.items?.length || data?.data?.length || 0,
    totalPages: data?.totalPages || 1,
  }
}

function LinkButton({ to, onNavigate, className = '', children }) {
  return (
    <a
      className={className}
      href={to}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
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

function Spinner() {
  return (
    <div className="admin-loading">
      <div className="admin-spinner" />
    </div>
  )
}

function AdminLogin({ auth, route, onNavigate, onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAdmin(auth)) {
      onNavigate(route.query.redirect || '/admin')
    }
  }, [auth, onNavigate, route.query.redirect])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await adminApi.login(username.trim(), password)
      localStorage.setItem(ADMIN_TOKEN_KEY, JSON.stringify(data))
      onLogin(data)
      onNavigate(route.query.redirect || '/admin')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-box">
        <div className="admin-login-logo">
          <LinkButton to="/" onNavigate={onNavigate}>
            BaseCore Sales
          </LinkButton>
        </div>
        <div className="admin-card admin-login-card">
          <p className="admin-login-message">Sign in to start your admin session</p>
          {error && <div className="admin-alert danger">{error}</div>}
          <form onSubmit={submit}>
            <div className="admin-input-group">
              <input
                autoFocus
                className="admin-control"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
              <span className="fa fa-user" />
            </div>
            <div className="admin-input-group">
              <input
                className="admin-control"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <span className="fa fa-lock" />
            </div>
            <button className="admin-btn primary block" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function RequireAdmin({ auth, route, onNavigate, onLogin, children }) {
  if (!auth || !isAdmin(auth)) {
    return (
      <AdminLogin
        auth={auth}
        route={{ query: { redirect: route.pathname } }}
        onNavigate={onNavigate}
        onLogin={onLogin}
      />
    )
  }

  return children
}

function AdminLayout({ auth, route, onNavigate, onLogout, children }) {
  const links = [
    { path: '/admin', label: 'Dashboard', icon: 'fa-dashboard' },
    { path: '/admin/orders', label: 'Orders', icon: 'fa-shopping-cart' },
    { path: '/admin/products', label: 'Products', icon: 'fa-archive' },
    { path: '/admin/categories', label: 'Categories', icon: 'fa-tags' },
    { path: '/admin/users', label: 'Users', icon: 'fa-users' },
  ]

  return (
    <div className="admin-wrapper">
      <nav className="admin-navbar">
        <div>
          <button className="admin-icon-btn" type="button" aria-label="Menu">
            <i className="fa fa-bars" />
          </button>
          <LinkButton className="admin-top-link" to="/" onNavigate={onNavigate}>
            Shop
          </LinkButton>
        </div>
        <div className="admin-user">
          <i className="fa fa-user-circle" />
          <span>{getName(auth)}</span>
          <button className="admin-logout" type="button" onClick={onLogout}>
            <i className="fa fa-sign-out" /> Logout
          </button>
        </div>
      </nav>

      <aside className="admin-sidebar">
        <LinkButton className="admin-brand" to="/admin" onNavigate={onNavigate}>
          <strong>Store</strong> Sales
        </LinkButton>
        <div className="admin-profile">
          <i className="fa fa-user-circle" />
          <div>
            <strong>{getName(auth)}</strong>
            <span>{getEmail(auth) || 'Administrator'}</span>
          </div>
        </div>
        <ul className="admin-menu">
          {links.map((link) => (
            <li key={link.path}>
              <LinkButton
                className={route.pathname === link.path ? 'active' : ''}
                to={link.path}
                onNavigate={onNavigate}
              >
                <i className={`fa ${link.icon}`} />
                <span>{link.label}</span>
              </LinkButton>
            </li>
          ))}
        </ul>
      </aside>

      <main className="admin-content">{children}</main>

      <footer className="admin-footer">
        <strong>Copyright 2024 BaseCore Sales.</strong>
        <span>Version 1.0.0</span>
      </footer>
    </div>
  )
}

function Dashboard({ auth }) {
  const token = getToken(auth)
  const [stats, setStats] = useState({ products: 0, categories: 0, users: 0, orders: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadStats() {
      setLoading(true)
      try {
        const [productData, categoryData] = await Promise.all([
          adminApi.getProducts({ page: 1, pageSize: 1 }),
          adminApi.getCategories(),
        ])
        let usersCount = 0

        try {
          const usersData = await adminApi.getUsers({ page: 1, pageSize: 1 }, token)
          usersCount = usersData?.totalCount || 0
        } catch {
          usersCount = 0
        }

        let ordersCount = 0
        try {
          const orderData = await adminApi.getOrders(token)
          ordersCount = Array.isArray(orderData) ? orderData.length : 0
        } catch {
          ordersCount = 0
        }

        if (!cancelled) {
          setStats({
            products: normalizeProductList(productData).totalCount,
            categories: Array.isArray(categoryData) ? categoryData.length : 0,
            users: usersCount,
            orders: ordersCount,
          })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadStats()
    return () => {
      cancelled = true
    }
  }, [token])

  if (loading) {
    return <Spinner />
  }

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="admin-stat-grid">
        <StatBox color="primary" icon="fa-shopping-cart" label="Orders" value={stats.orders} />
        <StatBox color="info" icon="fa-archive" label="Products" value={stats.products} />
        <StatBox color="success" icon="fa-tags" label="Categories" value={stats.categories} />
        <StatBox color="warning" icon="fa-users" label="Users" value={stats.users} />
      </div>
      <section className="admin-card">
        <h3>Welcome to BaseCore Sales System</h3>
        <p>Admin area for orders, products, categories, and users connected to the FW backend.</p>
      </section>
    </>
  )
}

function PageHeader({ title }) {
  return (
    <div className="admin-page-header">
      <h1>{title}</h1>
    </div>
  )
}

function StatBox({ color, icon, label, value }) {
  return (
    <div className={`admin-stat ${color}`}>
      <div>
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
      <i className={`fa ${icon}`} />
    </div>
  )
}

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

function Products({ auth, onDataChanged }) {
  const token = getToken(auth)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    price: 0,
    stock: 0,
    description: '',
    imageUrl: '',
    categoryId: '',
  })

  async function loadData() {
    setLoading(true)
    try {
      const [productData, categoryData] = await Promise.all([
        adminApi.getProducts({ keyword, categoryId, page: 1, pageSize: 100 }),
        adminApi.getCategories(),
      ])
      setProducts(normalizeProductList(productData).items)
      setCategories(Array.isArray(categoryData) ? categoryData : [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openModal(product = null) {
    setEditingProduct(product)
    setError('')
    setFormData(
      product
        ? {
            name: product.name || '',
            manufacturer: product.manufacturer || '',
            price: product.price || 0,
            stock: product.stock || 0,
            description: product.description || '',
            imageUrl: product.imageUrl || '',
            categoryId: product.categoryId || product.category?.id || '',
          }
        : {
            name: '',
            manufacturer: '',
            price: 0,
            stock: 0,
            description: '',
            imageUrl: '',
            categoryId: categories[0]?.id || '',
          },
    )
    setShowModal(true)
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    const payload = {
      ...formData,
      price: Number(formData.price),
      stock: Number(formData.stock),
      categoryId: Number(formData.categoryId),
    }

    try {
      if (editingProduct) {
        await adminApi.updateProduct(editingProduct.id, payload, token)
      } else {
        await adminApi.createProduct(payload, token)
      }
      setShowModal(false)
      await loadData()
      await onDataChanged()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function remove(product) {
    if (!window.confirm(`Delete product "${product.name}"?`)) {
      return
    }

    try {
      await adminApi.deleteProduct(product.id, token)
      await loadData()
      await onDataChanged()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <>
      <PageHeader title="Products Management" />
      <section className="admin-card">
        <div className="admin-card-toolbar">
          <form
            className="admin-search"
            onSubmit={(event) => {
              event.preventDefault()
              loadData()
            }}
          >
            <input className="admin-control" placeholder="Search..." value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            <select className="admin-control" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button className="admin-btn primary" type="submit">
              <i className="fa fa-search" /> Search
            </button>
          </form>
          <button className="admin-btn success" type="button" onClick={() => openModal()}>
            <i className="fa fa-plus" /> Add Product
          </button>
        </div>
        {error && <div className="admin-alert danger">{error}</div>}
        {loading ? (
          <Spinner />
        ) : (
          <DataTable
            emptyText="No products found"
            headers={['ID', 'Name', 'Manufacturer', 'Category', 'Price', 'Stock', 'Actions']}
            rows={products.map((product) => [
              product.id,
              product.name,
              product.manufacturer || 'N/A',
              product.category?.name || categories.find((category) => category.id === product.categoryId)?.name || '',
              formatCurrency(product.price),
              product.stock,
              <RowActions key="actions" onEdit={() => openModal(product)} onDelete={() => remove(product)} />,
            ])}
          />
        )}
      </section>
      {showModal && (
        <AdminModal title={editingProduct ? 'Edit Product' : 'Add Product'} onClose={() => setShowModal(false)}>
          <ProductForm
            categories={categories}
            error={error}
            formData={formData}
            setFormData={setFormData}
            onSubmit={submit}
            submitText={editingProduct ? 'Update' : 'Create'}
          />
        </AdminModal>
      )}
    </>
  )
}

function ProductForm({ categories, error, formData, setFormData, onSubmit, submitText }) {
  return (
    <form onSubmit={onSubmit}>
      {error && <div className="admin-alert danger">{error}</div>}
      <FormInput label="Name" value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} required />
      <FormInput label="Manufacturer" value={formData.manufacturer} onChange={(value) => setFormData({ ...formData, manufacturer: value })} />
      <label className="admin-label">Category</label>
      <select className="admin-control" value={formData.categoryId} onChange={(event) => setFormData({ ...formData, categoryId: event.target.value })} required>
        <option value="">Select Category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <FormInput label="Price" type="number" value={formData.price} onChange={(value) => setFormData({ ...formData, price: value })} required />
      <FormInput label="Stock" type="number" value={formData.stock} onChange={(value) => setFormData({ ...formData, stock: value })} required />
      <FormInput label="Image URL" value={formData.imageUrl} onChange={(value) => setFormData({ ...formData, imageUrl: value })} />
      <label className="admin-label">Description</label>
      <textarea className="admin-control" rows="3" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} />
      <div className="admin-modal-footer">
        <button className="admin-btn primary" type="submit">
          {submitText}
        </button>
      </div>
    </form>
  )
}

function Categories({ auth, onDataChanged }) {
  const token = getToken(auth)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ name: '', description: '' })

  async function loadData() {
    setLoading(true)
    try {
      const data = await adminApi.getCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openModal(category = null) {
    setEditingCategory(category)
    setError('')
    setFormData(category ? { name: category.name || '', description: category.description || '' } : { name: '', description: '' })
    setShowModal(true)
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    try {
      if (editingCategory) {
        await adminApi.updateCategory(editingCategory.id, formData, token)
      } else {
        await adminApi.createCategory(formData, token)
      }
      setShowModal(false)
      await loadData()
      await onDataChanged()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function remove(category) {
    if (!window.confirm(`Delete category "${category.name}"?`)) {
      return
    }

    try {
      await adminApi.deleteCategory(category.id, token)
      await loadData()
      await onDataChanged()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <>
      <PageHeader title="Categories Management" />
      <section className="admin-card">
        <div className="admin-card-toolbar">
          <h3>All Categories</h3>
          <button className="admin-btn success" type="button" onClick={() => openModal()}>
            <i className="fa fa-plus" /> Add Category
          </button>
        </div>
        {error && <div className="admin-alert danger">{error}</div>}
        {loading ? (
          <Spinner />
        ) : (
          <DataTable
            emptyText="No categories found"
            headers={['ID', 'Name', 'Description', 'Actions']}
            rows={categories.map((category) => [
              category.id,
              category.name,
              category.description,
              <RowActions key="actions" onEdit={() => openModal(category)} onDelete={() => remove(category)} />,
            ])}
          />
        )}
      </section>
      {showModal && (
        <AdminModal title={editingCategory ? 'Edit Category' : 'Add Category'} onClose={() => setShowModal(false)}>
          <form onSubmit={submit}>
            {error && <div className="admin-alert danger">{error}</div>}
            <FormInput label="Name" value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} required />
            <label className="admin-label">Description</label>
            <textarea className="admin-control" rows="3" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} />
            <div className="admin-modal-footer">
              <button className="admin-btn primary" type="submit">
                {editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </>
  )
}

function Users({ auth }) {
  const token = getToken(auth)
  const [users, setUsers] = useState([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    position: '',
    userType: 0,
    isActive: true,
  })

  async function loadData() {
    setLoading(true)
    try {
      const data = await adminApi.getUsers({ keyword, page: 1, pageSize: 100 }, token)
      setUsers(data?.data || [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function openModal(user = null) {
    setEditingUser(user)
    setError('')
    setFormData(
      user
        ? {
            username: user.username || '',
            password: '',
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            position: user.position || '',
            userType: user.userType || 0,
            isActive: user.isActive,
          }
        : {
            username: '',
            password: '',
            name: '',
            email: '',
            phone: '',
            position: '',
            userType: 0,
            isActive: true,
          },
    )
    setShowModal(true)
  }

  async function submit(event) {
    event.preventDefault()
    setError('')

    try {
      if (editingUser) {
        const payload = {
          password: formData.password || undefined,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          position: formData.position,
          userType: Number(formData.userType),
          isActive: formData.isActive,
        }
        await adminApi.updateUser(editingUser.id, payload, token)
      } else {
        await adminApi.createUser(
          {
            username: formData.username,
            password: formData.password,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            position: formData.position,
            userType: Number(formData.userType),
          },
          token,
        )
      }
      setShowModal(false)
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function remove(user) {
    if (!window.confirm(`Delete user "${user.username}"?`)) {
      return
    }

    try {
      await adminApi.deleteUser(user.id, token)
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <>
      <PageHeader title="Users Management" />
      <section className="admin-card">
        <div className="admin-card-toolbar">
          <form
            className="admin-search"
            onSubmit={(event) => {
              event.preventDefault()
              loadData()
            }}
          >
            <input className="admin-control" placeholder="Search by name, email, phone..." value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            <button className="admin-btn primary" type="submit">
              <i className="fa fa-search" /> Search
            </button>
          </form>
          <button className="admin-btn success" type="button" onClick={() => openModal()}>
            <i className="fa fa-plus" /> Add User
          </button>
        </div>
        {error && <div className="admin-alert danger">{error}</div>}
        {loading ? (
          <Spinner />
        ) : (
          <DataTable
            emptyText="No users found"
            headers={['Username', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Actions']}
            rows={users.map((user) => [
              user.username,
              user.name,
              user.email,
              user.phone,
              <span key="role" className={`admin-badge ${user.userType === 1 ? 'danger' : 'info'}`}>
                {user.userType === 1 ? 'Admin' : 'User'}
              </span>,
              <span key="status" className={`admin-badge ${user.isActive ? 'success' : 'secondary'}`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>,
              <RowActions key="actions" onEdit={() => openModal(user)} onDelete={() => remove(user)} />,
            ])}
          />
        )}
      </section>
      {showModal && (
        <AdminModal title={editingUser ? 'Edit User' : 'Add User'} onClose={() => setShowModal(false)}>
          <UserForm editing={Boolean(editingUser)} error={error} formData={formData} setFormData={setFormData} onSubmit={submit} />
        </AdminModal>
      )}
    </>
  )
}

function UserForm({ editing, error, formData, setFormData, onSubmit }) {
  return (
    <form onSubmit={onSubmit}>
      {error && <div className="admin-alert danger">{error}</div>}
      <FormInput label="Username" value={formData.username} onChange={(value) => setFormData({ ...formData, username: value })} required disabled={editing} />
      <FormInput label={editing ? 'Password (leave blank to keep current)' : 'Password'} type="password" value={formData.password} onChange={(value) => setFormData({ ...formData, password: value })} required={!editing} />
      <FormInput label="Name" value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} />
      <FormInput label="Email" type="email" value={formData.email} onChange={(value) => setFormData({ ...formData, email: value })} />
      <FormInput label="Phone" value={formData.phone} onChange={(value) => setFormData({ ...formData, phone: value })} />
      <FormInput label="Position" value={formData.position} onChange={(value) => setFormData({ ...formData, position: value })} />
      <label className="admin-label">Role</label>
      <select className="admin-control" value={formData.userType} onChange={(event) => setFormData({ ...formData, userType: event.target.value })}>
        <option value="0">User</option>
        <option value="1">Admin</option>
      </select>
      {editing && (
        <label className="admin-check">
          <input type="checkbox" checked={formData.isActive} onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })} />
          Active
        </label>
      )}
      <div className="admin-modal-footer">
        <button className="admin-btn primary" type="submit">
          {editing ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  )
}

function FormInput({ label, value, onChange, type = 'text', required = false, disabled = false }) {
  return (
    <>
      <label className="admin-label">{label}</label>
      <input className="admin-control" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} disabled={disabled} />
    </>
  )
}

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="admin-row-actions">
      <button className="admin-btn small info" type="button" onClick={onEdit}>
        <i className="fa fa-pencil" />
      </button>
      <button className="admin-btn small danger" type="button" onClick={onDelete}>
        <i className="fa fa-trash" />
      </button>
    </div>
  )
}

function DataTable({ headers, rows, emptyText }) {
  if (rows.length === 0) {
    return <div className="admin-empty compact">{emptyText}</div>
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminModal({ title, onClose, children }) {
  return (
    <>
      <div className="admin-modal-backdrop" onClick={onClose} />
      <div className="admin-modal">
        <div className="admin-modal-header">
          <h3>{title}</h3>
          <button type="button" onClick={onClose}>
            x
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
      </div>
    </>
  )
}

export default function AdminApp({
  auth,
  route,
  onNavigate,
  onLogin,
  onLogout,
  onDataChanged,
}) {
  const page = useMemo(() => {
    if (route.pathname === '/admin/login') {
      return 'login'
    }

    if (route.pathname === '/admin/products') {
      return 'products'
    }

    if (route.pathname === '/admin/orders') {
      return 'orders'
    }

    if (route.pathname === '/admin/categories') {
      return 'categories'
    }

    if (route.pathname === '/admin/users') {
      return 'users'
    }

    return 'dashboard'
  }, [route.pathname])

  if (page === 'login') {
    return <AdminLogin auth={auth} route={route} onNavigate={onNavigate} onLogin={onLogin} />
  }

  return (
    <RequireAdmin auth={auth} route={route} onNavigate={onNavigate} onLogin={onLogin}>
      <AdminLayout
        auth={auth}
        route={route}
        onNavigate={onNavigate}
        onLogout={() => {
          onLogout()
          onNavigate('/admin/login')
        }}
      >
        {page === 'dashboard' && <Dashboard auth={auth} />}
        {page === 'orders' && <Orders auth={auth} />}
        {page === 'products' && <Products auth={auth} onDataChanged={onDataChanged} />}
        {page === 'categories' && <Categories auth={auth} onDataChanged={onDataChanged} />}
        {page === 'users' && <Users auth={auth} />}
      </AdminLayout>
    </RequireAdmin>
  )
}
