import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { UserProfile } from '../services/authService'
import * as authService from '../services/authService'

/* ── Types ───────────────────────────────────────────────────── */
interface AuthContextType {
  isAuthenticated: boolean
  user: UserProfile | null
  token: string | null
  /** Call this after a successful API login/register response */
  loginWithCredentials: (token: string, user: UserProfile) => void
  /** Legacy no-arg login (kept for backward compat during transition) */
  login: () => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/* ── Storage keys ────────────────────────────────────────────── */
const TOKEN_KEY = 'rx_token'
const USER_KEY  = 'rx_user'

/* ── Provider ────────────────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken]   = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser]     = useState<UserProfile | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(false)

  const isAuthenticated = !!token && !!user

  // Keep localStorage in sync whenever token or user changes
  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }, [token])

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }, [user])

  // ── loginWithCredentials — real JWT login ─────────────────
  const loginWithCredentials = (newToken: string, newUser: UserProfile) => {
    setToken(newToken)
    setUser(newUser)
  }

  // ── Legacy login (backward compat) ───────────────────────
  // This will only set a stub user so existing pages don't break
  const login = () => {
    // If already authenticated via loginWithCredentials, do nothing
    if (isAuthenticated) return
    // Fallback: mark as authenticated with a minimal stub
    setToken('legacy')
    setUser({ id: 'local', name: 'User', email: '', role: 'user' })
  }

  // ── Logout ───────────────────────────────────────────────
  const logout = async () => {
    setIsLoading(true)
    try {
      await authService.logout()
    } catch {
      // ignore
    } finally {
      setToken(null)
      setUser(null)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      // Also clear legacy keys
      localStorage.removeItem('isAuthenticated')
      localStorage.removeItem('emp_name')
      localStorage.removeItem('emp_vehicle')
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, token, loginWithCredentials, login, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/* ── Hook ────────────────────────────────────────────────────── */
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
