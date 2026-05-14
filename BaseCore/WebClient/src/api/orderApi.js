import { apiRequest } from './axiosClient'

export const orderApi = {
  getMine: (token) => apiRequest('/orders', { token }),
  getAll: (token) => apiRequest('/orders/all', { token }),
  getById: (id, token) => apiRequest(`/orders/${id}`, { token }),
  create: (payload, token) =>
    apiRequest('/orders', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  confirmReceived: (id, token) =>
    apiRequest(`/orders/${id}/received`, {
      method: 'PUT',
      token,
    }),
  confirmByAdmin: (id, token) =>
    apiRequest(`/orders/${id}/admin/confirm`, {
      method: 'PUT',
      token,
    }),
  shipByAdmin: (id, token) =>
    apiRequest(`/orders/${id}/admin/ship`, {
      method: 'PUT',
      token,
    }),
}
