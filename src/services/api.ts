import axios from 'axios'

/**
 * Axios instance for RideXpress backend API.
 * Automatically attaches the JWT token from localStorage to every request.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// ── Request interceptor — attach Bearer token ─────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rx_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — normalise errors ───────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred.'

    // If 401 and not on login/register, clear stale token
    if (
      error.response?.status === 401 &&
      !window.location.pathname.includes('/login') &&
      !window.location.pathname.includes('/register')
    ) {
      localStorage.removeItem('rx_token')
      localStorage.removeItem('rx_user')
    }

    return Promise.reject(new Error(message))
  }
)

export default api
