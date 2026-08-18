import api from './api'

/* ── Types ───────────────────────────────────────────────────── */
export interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  city?: string
  role: 'user' | 'employee' | 'admin'
  employeeId?: string
  vehicleCategory?: string
}

export interface AuthResponse {
  success: boolean
  message: string
  token: string
  user: UserProfile
}

/* ═══════════════════════════════════════════════════════════════
   Register a new customer account
   ═══════════════════════════════════════════════════════════════ */
export const registerUser = async (data: {
  name: string
  email: string
  password: string
  phone?: string
  city?: string
}): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/register/user', data)
  return res.data
}

/* ═══════════════════════════════════════════════════════════════
   Register a new employee account
   ═══════════════════════════════════════════════════════════════ */
export const registerEmployee = async (data: {
  name: string
  email: string
  password: string
  phone?: string
  department?: string
  designation?: string
  vehicleCategory?: string
}): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/register/employee', data)
  return res.data
}

/* ═══════════════════════════════════════════════════════════════
   Login — accountType must be 'user' or 'employee'
   ═══════════════════════════════════════════════════════════════ */
export const login = async (data: {
  email: string
  password: string
  accountType: 'user' | 'employee'
}): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/login', data)
  return res.data
}

/* ═══════════════════════════════════════════════════════════════
   Get the currently authenticated account's profile
   ═══════════════════════════════════════════════════════════════ */
export const getMe = async (): Promise<{ success: boolean; user: UserProfile }> => {
  const res = await api.get('/auth/me')
  return res.data
}

/* ═══════════════════════════════════════════════════════════════
   Logout — inform the server (for future refresh-token support)
   ═══════════════════════════════════════════════════════════════ */
export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout')
  } catch {
    // Ignore logout errors — the client will clear the token regardless
  }
}
