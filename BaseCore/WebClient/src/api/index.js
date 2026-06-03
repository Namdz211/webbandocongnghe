function getResponseMessage(data, response) {
  if (response.status === 401) {
    return 'Phien dang nhap da het han hoac token khong hop le. Hay dang nhap lai.'
  }

  if (response.status === 403) {
    return 'Tai khoan hien tai khong co quyen thuc hien thao tac nay.'
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

  return `Backend tra loi ${response.status}. Kiem tra lai API/gateway va du lieu SQL Server.`
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
