export const ADMIN_TOKEN_KEY = 'electro-store-auth'
export const ORDER_REFRESH_INTERVAL_MS = 5000

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function getToken(auth) {
  return auth?.token || auth?.Token || ''
}

export function getRole(auth) {
  return String(auth?.role || auth?.Role || '').toLowerCase()
}

export function isAdmin(auth) {
  return getRole(auth) === 'admin'
}

export function getName(auth) {
  return auth?.name || auth?.Name || auth?.username || auth?.Username || 'Admin'
}

export function getEmail(auth) {
  return auth?.email || auth?.Email || ''
}

export function getMessage(data, response) {
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

export async function request(path, options = {}) {
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

export function toQuery(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  })

  return searchParams.toString()
}

export const adminApi = {
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

export function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function formatDate(value) {
  if (!value) {
    return 'N/A'
  }

  try {
    return dateFormatter.format(new Date(value))
  } catch {
    return value
  }
}

export function getOrderStatusLabel(order) {
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

export function getOrderStatusBadge(status) {
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

export function normalizeProductList(data) {
  if (Array.isArray(data)) {
    return { items: data, totalCount: data.length, totalPages: 1 }
  }

  return {
    items: data?.items || data?.data || [],
    totalCount: data?.totalCount || data?.items?.length || data?.data?.length || 0,
    totalPages: data?.totalPages || 1,
  }
}
