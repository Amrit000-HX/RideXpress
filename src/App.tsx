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
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'

export default function App() {
  const location = useLocation()
  const hideNavFooter = [
    '/login', '/register', '/parcel-form',
    '/employee-form', '/employee-dashboard',
  ].includes(location.pathname)

  return (
    <AuthProvider>
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
    </AuthProvider>
  )
}
