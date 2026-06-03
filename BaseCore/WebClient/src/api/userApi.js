import { apiRequest, toQueryString } from './axiosClient'

export const userApi = {
  getAll: (params = {}, token) => apiRequest(`/users?${toQueryString(params)}`, { token }),
  create: (payload, token) =>
    apiRequest('/users', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  update: (id, payload, token) =>
    apiRequest(`/users/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),
  remove: (id, token) =>
    apiRequest(`/users/${id}`, {
      method: 'DELETE',
      token,
    }),
}
