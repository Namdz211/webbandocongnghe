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

export const api = {
  getCategories: () => request('/categories'),
  getProducts: (params = {}) => request(`/products?${toQueryString(params)}`),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (payload, token) =>
    request('/products', { method: 'POST', token, body: JSON.stringify(payload) }),
  updateProduct: (id, payload, token) =>
    request(`/products/${id}`, { method: 'PUT', token, body: JSON.stringify(payload) }),
  deleteProduct: (id, token) => request(`/products/${id}`, { method: 'DELETE', token }),
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (payload) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload, token) =>
    request(`/users/${id}`, { method: 'PUT', token, body: JSON.stringify(payload) }),
  getOrders: (token) => request('/orders', { token }),
  getOrder: (id, token) => request(`/orders/${id}`, { token }),
  createOrder: (payload, token) =>
    request('/orders', { method: 'POST', token, body: JSON.stringify(payload) }),
  confirmOrderReceived: (id, token) =>
    request(`/orders/${id}/received`, { method: 'PUT', token }),
  getReviews: (productId) => request(`/reviews/product/${productId}`),
  canReview: (productId, token) => request(`/reviews/can-review/${productId}`, { token }),
  createReview: (payload, token) =>
    request('/reviews', { method: 'POST', token, body: JSON.stringify(payload) }),
}