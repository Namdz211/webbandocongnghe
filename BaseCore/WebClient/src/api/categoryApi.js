import { apiRequest } from './axiosClient'

export const categoryApi = {
  getAll: () => apiRequest('/categories'),
  create: (payload, token) =>
    apiRequest('/categories', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  update: (id, payload, token) =>
    apiRequest(`/categories/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),
  remove: (id, token) =>
    apiRequest(`/categories/${id}`, {
      method: 'DELETE',
      token,
    }),
}
