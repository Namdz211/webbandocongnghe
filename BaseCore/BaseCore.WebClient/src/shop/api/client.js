import { getResponseMessage } from '../utils/apiErrors.js'



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
  getManufacturers: (params = {}) =>
    request(`/products/manufacturers?${toQueryString(params)}`),
  getProducts: (params = {}) =>
    request(`/products?${toQueryString(params)}`),
  getProduct: (id) => request(`/products/${id}`),
  getPublicCoupons: () => request('/coupons/public'),
  getProductReviews: (id, token) =>
    request(`/products/${id}/reviews`, {
      token,
      cache: 'no-store',
    }),
  saveProductReview: (id, payload, token) =>
    request(`/products/${id}/reviews`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
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
  getOrder: (id, token) =>
    request(`/orders/${id}`, {
      token,
    }),
  createOrder: (payload, token) =>
    request('/orders', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  confirmOrderReceived: (id, token) =>
    request(`/orders/${id}/received`, {
      method: 'PUT',
      token,
    }),
  cancelOrder: (id, token) =>
    request(`/orders/${id}/cancel`, {
      method: 'PUT',
      token,
    }),
}

export default api
