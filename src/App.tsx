import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import BookRide from './pages/BookRide'
import RideReceipt from './pages/RideReceipt'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DeliverParcel from './pages/DeliverParcel'
import ParcelForm from './pages/ParcelForm'
import EmployeeForm from './pages/EmployeeForm'
import EmployeeDashboard from './pages/EmployeeDashboard'
import UserDashboard from './pages/UserDashboard'
import RideStatus from './pages/RideStatus'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import { NotificationProvider, useNotifications } from './contexts/NotificationContext'
import { NotificationToast } from './components/NotificationToast'

function GlobalNotificationToasts() {
  const { notifications, dismiss } = useNotifications()
  return <NotificationToast notifications={notifications} onDismiss={dismiss} />
}

export default function App() {
  const location = useLocation()
  const hideNavFooter = [
    '/login', '/register', '/parcel-form',
    '/employee-form', '/employee-dashboard', '/dashboard',
  ].includes(location.pathname)

  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <GlobalNotificationToasts />
          {!hideNavFooter && <Navbar />}
          <Routes>
            <Route path="/"            element={<Home />} />
            <Route path="/book"        element={<BookRide />} />
            <Route path="/ride-receipt" element={<RideReceipt />} />
            <Route path="/login"       element={<LoginPage />} />
            <Route path="/register"    element={<RegisterPage />} />
            <Route path="/deliver"     element={<DeliverParcel />} />
            <Route path="/parcel-form" element={<ParcelForm />} />
            <Route path="/employee-form" element={<EmployeeForm />} />

            {/* Protected: only authenticated users */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['user', 'admin']}>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected: live ride status tracking */}
            <Route
              path="/ride-status/:rideId"
              element={
                <ProtectedRoute allowedRoles={['user', 'admin']}>
                  <RideStatus />
                </ProtectedRoute>
              }
            />

            {/* Protected: only authenticated employees/admins */}
            <Route
              path="/employee-dashboard"
              element={
                <ProtectedRoute allowedRoles={['employee', 'admin']}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
          {!hideNavFooter && <Footer />}
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  )
}
