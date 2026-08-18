import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** If provided, only this role can access; others get a 403 redirect */
  allowedRoles?: Array<'user' | 'employee' | 'admin'>
}

/**
 * ProtectedRoute
 * Redirects to /login with the current location stored in state if not authenticated.
 * Optionally restricts by role — unauthorized roles are redirected to /.
 */
export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Unauthorized role → redirect to home
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
