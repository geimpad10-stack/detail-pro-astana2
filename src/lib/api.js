const API = '/api'

function getToken() {
  return localStorage.getItem('dp_token')
}

export function setToken(token) {
  if (token) localStorage.setItem('dp_token', token)
  else localStorage.removeItem('dp_token')
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(API + path, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Ошибка запроса')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  updateMe: (body) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),

  getServices: (all = false) => request('/services' + (all ? '?all=1' : '')),
  calculate: (body) => request('/services/calculate', { method: 'POST', body: JSON.stringify(body) }),
  publicSettings: () => request('/public-settings'),

  getSlots: (params) => request('/bookings/slots?' + new URLSearchParams(params)),
  createBooking: (body) => request('/bookings', { method: 'POST', body: JSON.stringify(body) }),
  getBookingByNumber: (n) => request('/bookings/by-number/' + encodeURIComponent(n)),
  myBookings: () => request('/bookings/my'),
  cancelBooking: (id, reason) => request(`/bookings/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  submitReview: (id, body) => request(`/bookings/${id}/review`, { method: 'POST', body: JSON.stringify(body) }),
  getReviews: () => request('/bookings/reviews'),

  dashboard: () => request('/admin/dashboard'),
  adminBookings: (params = {}) => request('/bookings?' + new URLSearchParams(params)),
  getBooking: (id) => request(`/bookings/${id}`),
  updateBooking: (id, body) => request(`/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  employees: () => request('/admin/employees'),
  createEmployee: (body) => request('/admin/employees', { method: 'POST', body: JSON.stringify(body) }),
  updateEmployee: (id, body) => request(`/admin/employees/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  materials: () => request('/admin/materials'),
  createMaterial: (body) => request('/admin/materials', { method: 'POST', body: JSON.stringify(body) }),
  materialMovement: (id, body) => request(`/admin/materials/${id}/movement`, { method: 'POST', body: JSON.stringify(body) }),
  settings: () => request('/admin/settings'),
  updateSettings: (body) => request('/admin/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  analytics: (params = {}) => request('/admin/analytics?' + new URLSearchParams(params)),
  clients: () => request('/admin/clients'),
  createService: (body) => request('/services', { method: 'POST', body: JSON.stringify(body) }),
  updateService: (id, body) => request(`/services/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
}

export default api
