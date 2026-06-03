import { apiRequest, toQueryString } from './axiosClient'

export const productApi = {
  getAll: (params = {}) => apiRequest(`/products?${toQueryString(params)}`),
  getById: (id) => apiRequest(`/products/${id}`),
  create: (payload, token) =>
    apiRequest('/products', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  update: (id, payload, token) =>
    apiRequest(`/products/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),
  remove: (id, token) =>
    apiRequest(`/products/${id}`, {
      method: 'DELETE',
      token,
    }),
}
