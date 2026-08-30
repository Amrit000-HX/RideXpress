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

export interface LoginRequestResponse {
  success: boolean
  message: string
  email: string
  accountType: 'user' | 'employee'
  devOtp?: string
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
   2-Step OTP Authentication Endpoints
   ═══════════════════════════════════════════════════════════════ */

/** Step 1: Validate password & send 6-digit OTP to email */
export const loginRequest = async (data: {
  email: string
  password: string
  accountType: 'user' | 'employee'
}): Promise<LoginRequestResponse> => {
  const res = await api.post<LoginRequestResponse>('/auth/login-request', data)
  return res.data
}

/** Step 2: Validate 6-digit OTP code & receive JWT session */
export const verifyOtp = async (data: {
  email: string
  otp: string
  accountType: 'user' | 'employee'
}): Promise<AuthResponse> => {
  const res = await api.post<AuthResponse>('/auth/verify-otp', data)
  return res.data
}

/** Resend 6-digit OTP code to email */
export const resendOtp = async (data: {
  email: string
  accountType: 'user' | 'employee'
}): Promise<{ success: boolean; message: string; devOtp?: string }> => {
  const res = await api.post<{ success: boolean; message: string; devOtp?: string }>('/auth/resend-otp', data)
  return res.data
}

/* ═══════════════════════════════════════════════════════════════
   Direct Login (Backward compatibility)
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
   Logout
   ═══════════════════════════════════════════════════════════════ */
export const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout')
  } catch {
    // Client will clear token regardless
  }
}
