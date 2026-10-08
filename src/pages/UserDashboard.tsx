/**
 * UserDashboard.tsx
 * User's ride management hub — active ride tracking, history, cancellation.
 * Palette: Cream #F5F0E8 · Sage-Green #6B9E72 · Charcoal #1A1A1A
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import { useNotifications } from '../contexts/NotificationContext'
import {
  MapPin, Clock, Star, Car, Navigation, CheckCircle2,
  XCircle, AlertCircle, Loader2, ArrowRight, Phone,
  History, Wallet, RefreshCw, X, MessageSquare, Bell,
  CalendarDays, ChevronRight,
} from 'lucide-react'
import {
  getActiveRide,
  getMyRides,
  getAllRides,
  cancelRideBooking,
} from '../services/rideService'
import ChatBox from '../components/ChatBox'
import './UserDashboard.css'

/* ── Status helpers ─────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; description: string }> = {
  searching:      { label: 'Searching',       color: '#f59e0b', icon: Loader2,      description: 'Looking for a driver near you…' },
  requested:      { label: 'Driver Notified', color: '#3b82f6', icon: Bell,          description: 'Waiting for driver to accept…' },
  assigned:       { label: 'Driver Assigned', color: '#6B9E72', icon: CheckCircle2,  description: 'Driver accepted your ride!' },
  rider_arriving: { label: 'Driver En Route', color: '#6B9E72', icon: Navigation,    description: 'Your driver is heading to you' },
  rider_arrived:  { label: 'Driver Arrived',  color: '#6B9E72', icon: MapPin,        description: 'Driver is at the pickup location' },
  in_progress:    { label: 'Ride Started',    color: '#6B9E72', icon: Car,           description: 'Your ride is in progress' },
  completed:      { label: 'Completed',       color: '#6B9E72', icon: CheckCircle2,  description: 'Ride completed successfully' },
  cancelled:      { label: 'Cancelled',       color: '#ef4444', icon: XCircle,       description: 'This ride was cancelled' },
  rejected:       { label: 'No Driver Found', color: '#ef4444', icon: AlertCircle,   description: 'No available drivers found' },
  expired:        { label: 'Expired',         color: '#6b7280', icon: AlertCircle,   description: 'Request timed out' },
}

const CANCELLATION_REASONS = [
  'Changed my mind',
  'Driver taking too long',
  'Found another ride',
  'Wrong pickup location',
  'Emergency',
  'Other',
]

/* ── Status Progress Bar ────────────────────────────────────── */
const STATUS_STEPS = ['searching', 'assigned', 'rider_arriving', 'rider_arrived', 'in_progress', 'completed']

function StatusTimeline({ status }: { status: string }) {
  const stepIdx = STATUS_STEPS.indexOf(status)
  const labels  = ['Searching', 'Accepted', 'En Route', 'Arrived', 'In Ride', 'Done']

  return (
    <div className="ud-timeline">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} className={`ud-tl-step ${i <= stepIdx ? 'ud-tl-done' : ''} ${i === stepIdx ? 'ud-tl-active' : ''}`}>
          <div className="ud-tl-dot">
            {i < stepIdx ? <CheckCircle2 size={12} /> : i === stepIdx ? <div className="ud-tl-pulse" /> : null}
          </div>
          <span className="ud-tl-label">{labels[i]}</span>
          {i < STATUS_STEPS.length - 1 && <div className={`ud-tl-line ${i < stepIdx ? 'ud-tl-line-done' : ''}`} />}
        </div>
      ))}
    </div>
  )
}

/* ── Current Ride Card ──────────────────────────────────────── */
function ActiveRideCard({
  ride,
  onCancel,
  onRefresh,
}: {
  ride: any
  onCancel: () => void
  onRefresh: () => void
}) {
  const { user } = useAuth()
  const [showChat, setShowChat] = useState(false)
  const config = STATUS_CONFIG[ride.status] || STATUS_CONFIG['searching']
  const StatusIcon = config.icon
  const canCancel = ['searching', 'requested', 'assigned', 'rider_arriving', 'rider_arrived'].includes(ride.status)
  const canChat   = ['assigned', 'rider_arriving', 'rider_arrived', 'in_progress'].includes(ride.status)

  return (
    <motion.div
      className="ud-card ud-active-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="ud-active-header">
        <div>
          <p className="ud-card-label">Current Ride</p>
          <h3 className="ud-card-title">{ride.bookingId}</h3>
        </div>
        <div className="ud-status-badge" style={{ background: `${config.color}22`, color: config.color, borderColor: `${config.color}44` }}>
          <StatusIcon size={13} className={ride.status === 'searching' || ride.status === 'requested' ? 'ud-spin' : ''} />
          {config.label}
        </div>
      </div>

      {/* Status description */}
      <p className="ud-status-desc">{config.description}</p>

      {/* Status timeline */}
      {!['cancelled', 'rejected', 'expired'].includes(ride.status) && (
        <StatusTimeline status={ride.status} />
      )}

      {/* Route */}
      <div className="ud-route-block">
        <div className="ud-route-row">
          <span className="ud-route-dot ud-dot-green" />
          <div>
            <div className="ud-route-label">PICKUP</div>
            <div className="ud-route-addr">{ride.pickup?.address}</div>
          </div>
        </div>
        <div className="ud-route-connector" />
        <div className="ud-route-row">
          <span className="ud-route-dot ud-dot-red" />
          <div>
            <div className="ud-route-label">DESTINATION</div>
            <div className="ud-route-addr">{ride.drop?.address}</div>
          </div>
        </div>
      </div>

      {/* Driver info (if assigned) */}
      {ride.driverName && ['assigned', 'rider_arriving', 'rider_arrived', 'in_progress'].includes(ride.status) && (
        <div className="ud-driver-card">
          <div className="ud-driver-avatar">{ride.driverName[0]?.toUpperCase()}</div>
          <div className="ud-driver-info">
            <div className="ud-driver-name">{ride.driverName}</div>
            <div className="ud-driver-meta">
              <span className="ud-driver-vehicle">{ride.vehicleType} · {ride.driverVehicleNumber || 'XX 00 XX 0000'}</span>
              <span className="ud-driver-rating"><Star size={11} fill="#6B9E72" stroke="#6B9E72" /> {ride.driverRating || 4.9}</span>
            </div>
          </div>
          {ride.driverPhone && (
            <a href={`tel:${ride.driverPhone}`} className="ud-call-btn" aria-label="Call driver">
              <Phone size={15} />
            </a>
          )}
        </div>
      )}

      {/* Fare + Vehicle */}
      <div className="ud-fare-row">
        <div className="ud-fare-item">
          <span className="ud-fare-label">Vehicle</span>
          <span className="ud-fare-value">{ride.vehicleType}</span>
        </div>
        <div className="ud-fare-item">
          <span className="ud-fare-label">Est. Fare</span>
          <span className="ud-fare-value ud-fare-green">₹{ride.estimatedFare}</span>
        </div>
        <div className="ud-fare-item">
          <span className="ud-fare-label">Distance</span>
          <span className="ud-fare-value">{ride.distanceKm} km</span>
        </div>
        {ride.startRidePin && ['assigned', 'rider_arriving', 'rider_arrived'].includes(ride.status) && (
          <div className="ud-fare-item">
            <span className="ud-fare-label">Start PIN</span>
            <span className="ud-fare-value ud-pin">{ride.startRidePin}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="ud-actions">
        <Link to={`/ride-status/${ride._id || ride.bookingId}`} className="ud-btn-ghost ud-btn-active" style={{ textDecoration: 'none' }}>
          <Navigation size={14} /> Live Tracking View
        </Link>
        <button className="ud-btn-ghost" onClick={onRefresh}>
          <RefreshCw size={14} /> Refresh
        </button>
        {canChat && (
          <button
            className={`ud-btn-ghost ${showChat ? 'ud-btn-active' : ''}`}
            onClick={() => setShowChat(v => !v)}
          >
            <MessageSquare size={14} /> {showChat ? 'Close Chat' : 'Chat'}
          </button>
        )}
        {canCancel && (
          <button className="ud-btn-danger" onClick={onCancel}>
            <X size={14} /> Cancel Ride
          </button>
        )}
      </div>

      {/* Chat */}
      <AnimatePresence>
        {showChat && (
          <ChatBox
            rideId={ride._id}
            currentUserId={user?.id || ''}
            currentUserName={user?.name || 'Passenger'}
            currentUserRole="customer"
            partnerName={ride.driverName || 'Driver'}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Ride History Row ────────────────────────────────────────── */
function RideHistoryRow({ ride }: { ride: any }) {
  const config = STATUS_CONFIG[ride.status] || STATUS_CONFIG['searching']
  const StatusIcon = config.icon
  const date = new Date(ride.bookedAt || ride.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const time = new Date(ride.bookedAt || ride.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <motion.div
      className="ud-history-row"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="ud-history-icon" style={{ background: `${config.color}22`, color: config.color }}>
        <StatusIcon size={14} />
      </div>
      <div className="ud-history-info">
        <div className="ud-history-route">
          <span className="ud-history-from">{ride.pickup?.address?.slice(0, 28)}{ride.pickup?.address?.length > 28 ? '…' : ''}</span>
          <ArrowRight size={11} className="ud-arrow" />
          <span className="ud-history-to">{ride.drop?.address?.slice(0, 28)}{ride.drop?.address?.length > 28 ? '…' : ''}</span>
        </div>
        <div className="ud-history-meta">
          <CalendarDays size={10} /> {date} · {time}
          <span className="ud-sep">·</span>
          <span className="ud-history-id">{ride.bookingId}</span>
        </div>
      </div>
      <div className="ud-history-right">
        <span className="ud-history-fare">{ride.status === 'completed' ? `₹${ride.actualFare || ride.estimatedFare}` : '—'}</span>
        <span className="ud-history-status" style={{ color: config.color }}>{config.label}</span>
      </div>
    </motion.div>
  )
}

/* ── Cancel Modal ─────────────────────────────────────────────── */
function CancelModal({
  onConfirm,
  onClose,
  loading,
}: {
  onConfirm: (reason: string) => void
  onClose: () => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')

  const handleConfirm = () => {
    const finalReason = reason === 'Other' ? customReason : reason
    onConfirm(finalReason)
  }

  return (
    <motion.div
      className="ud-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="ud-modal"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="ud-modal-header">
          <h3>Cancel Ride?</h3>
          <button className="ud-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="ud-modal-desc">Please select a reason for cancellation:</p>

        <div className="ud-reason-list">
          {CANCELLATION_REASONS.map(r => (
            <button
              key={r}
              className={`ud-reason-btn ${reason === r ? 'ud-reason-active' : ''}`}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
        </div>

        {reason === 'Other' && (
          <textarea
            className="ud-reason-textarea"
            placeholder="Please describe the reason…"
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            rows={3}
          />
        )}

        <div className="ud-modal-actions">
          <button className="ud-btn-ghost" onClick={onClose} disabled={loading}>Keep Ride</button>
          <button
            className="ud-btn-danger ud-btn-full"
            onClick={handleConfirm}
            disabled={!reason || loading}
          >
            {loading ? <><Loader2 size={14} className="ud-spin" /> Cancelling…</> : 'Yes, Cancel Ride'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Main Component ──────────────────────────────────────────── */
export default function UserDashboard() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const { socket, isConnected } = useSocket()
  const { notifications, unreadCount, markAllRead } = useNotifications()

  const [activeRide, setActiveRide]       = useState<any | null>(null)
  const [rideHistory, setRideHistory]     = useState<any[]>([])
  const [loadingRide, setLoadingRide]     = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [activeTab, setActiveTab]         = useState<'current' | 'history' | 'notifications' | 'admin'>('current')
  const [error, setError]                 = useState<string | null>(null)
  const [adminRides, setAdminRides]       = useState<any[]>([])
  const [adminFilter, setAdminFilter]     = useState('all')
  const [adminLoading, setAdminLoading]   = useState(false)

  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { state: { from: '/dashboard' } })
  }, [isAuthenticated, navigate])

  const loadActiveRide = useCallback(async () => {
    try {
      setLoadingRide(true)
      const ride = await getActiveRide()
      setActiveRide(ride)
    } catch (err: any) {
      console.warn('Could not load active ride:', err?.message)
    } finally {
      setLoadingRide(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true)
      const res = await getMyRides()
      setRideHistory(res.rides || [])
    } catch (err: any) {
      console.warn('Could not load ride history:', err?.message)
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  const loadAdminRides = useCallback(async () => {
    try {
      setAdminLoading(true)
      const res = await getAllRides(adminFilter === 'all' ? undefined : adminFilter)
      setAdminRides(res.rides || [])
    } catch (err: any) {
      console.warn('Could not load admin rides:', err?.message)
    } finally {
      setAdminLoading(false)
    }
  }, [adminFilter])

  // Ref to suppress duplicate socket-triggered refetches right after a manual cancel
  const isFetchingAfterCancel = useRef(false)

  // Initial load — only runs once on mount (stable deps)
  useEffect(() => {
    loadActiveRide()
    loadHistory()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Admin rides — refetch when filter changes
  useEffect(() => {
    if (user?.role === 'admin') loadAdminRides()
  }, [adminFilter, user?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time ride status updates
  useEffect(() => {
    if (!socket || !isConnected) return

    const handleStatusChange = (data: any) => {
      setActiveRide((prev: any) => {
        if (!prev) return prev
        if (String(prev._id) === String(data.rideId)) {
          return { ...prev, status: data.status, ...data }
        }
        return prev
      })
      // Reload history when ride reaches a terminal state,
      // but skip if we already triggered a reload from handleCancelRide
      if (['completed', 'cancelled', 'rejected', 'expired'].includes(data.status)) {
        if (!isFetchingAfterCancel.current) {
          setTimeout(() => {
            loadHistory()
            loadActiveRide()
          }, 1000)
        }
      }
    }

    const handleRideAccepted = (data: any) => {
      setActiveRide((prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          status: 'assigned',
          driverName: data.driver?.name || prev.driverName,
          driverPhone: data.driver?.phone || prev.driverPhone,
          driverVehicleNumber: data.driver?.vehicleNumber || prev.driverVehicleNumber,
          driverRating: data.driver?.rating || prev.driverRating,
        }
      })
    }

    const handleRideCancelled = (data: any) => {
      setActiveRide((prev: any) => {
        if (!prev) return prev
        if (String(prev._id) === String(data.rideId)) {
          return { ...prev, status: 'cancelled', cancelledBy: data.cancelledBy }
        }
        return prev
      })
      // Only reload if we didn't already trigger it from handleCancelRide
      if (!isFetchingAfterCancel.current) {
        setTimeout(() => { loadHistory(); loadActiveRide() }, 1000)
      }
    }

    const handleNoDriver = (data: any) => {
      setActiveRide((prev: any) => {
        if (!prev) return prev
        if (String(prev._id) === String(data.rideId)) {
          return { ...prev, status: 'rejected' }
        }
        return prev
      })
      if (!isFetchingAfterCancel.current) {
        setTimeout(() => { loadHistory(); loadActiveRide() }, 1500)
      }
    }

    socket.on('ride:status_changed', handleStatusChange)
    socket.on('ride:accepted', handleRideAccepted)
    socket.on('ride:cancelled', handleRideCancelled)
    socket.on('ride:no_driver', handleNoDriver)

    return () => {
      socket.off('ride:status_changed', handleStatusChange)
      socket.off('ride:accepted', handleRideAccepted)
      socket.off('ride:cancelled', handleRideCancelled)
      socket.off('ride:no_driver', handleNoDriver)
    }
  }, [socket, isConnected]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancelRide = async (reason: string) => {
    if (!activeRide) return
    try {
      setCancelLoading(true)
      isFetchingAfterCancel.current = true  // suppress socket-triggered double fetch
      await cancelRideBooking(activeRide._id, reason)
      setShowCancelModal(false)
      setActiveRide(null)
      await loadHistory()
      await loadActiveRide()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel ride.')
    } finally {
      setCancelLoading(false)
      // Allow socket handlers to reload again after a short delay
      setTimeout(() => { isFetchingAfterCancel.current = false }, 2000)
    }
  }

  // Summary stats
  const completedCount = rideHistory.filter(r => r.status === 'completed').length
  const totalSpent     = rideHistory.filter(r => r.status === 'completed').reduce((s, r) => s + (r.actualFare || r.estimatedFare || 0), 0)

  if (!isAuthenticated) return null

  return (
    <div className="ud-page">

      {/* ── Header ── */}
      <div className="ud-header">
        <div className="ud-header-inner">
          <div>
            <p className="ud-header-label">Welcome back,</p>
            <h1 className="ud-header-name">{user?.name}</h1>
          </div>
          <div className="ud-header-actions">
            <Link to="/book" className="ud-book-btn">
              <Car size={16} /> Book a Ride
            </Link>
            <button className="ud-logout-btn" onClick={() => { logout(); navigate('/login') }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="ud-stats-strip">
        {[
          { icon: Car,     value: completedCount, label: 'Rides Completed' },
          { icon: Wallet,  value: `₹${totalSpent}`, label: 'Total Spent' },
          { icon: History, value: rideHistory.length, label: 'Total Bookings' },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="ud-stat">
            <Icon size={18} className="ud-stat-icon" />
            <div className="ud-stat-val">{value}</div>
            <div className="ud-stat-lbl">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="ud-tabs">
        {[
          { key: 'current',      label: 'Current Ride', badge: activeRide ? '1' : null },
          { key: 'history',      label: 'Ride History', badge: rideHistory.length || null },
          { key: 'notifications',label: 'Notifications', badge: unreadCount > 0 ? unreadCount : null },
          ...(user?.role === 'admin' ? [{ key: 'admin', label: 'Admin Fleet Monitor', badge: 'Admin' }] : []),
        ].map(t => (
          <button
            key={t.key}
            className={`ud-tab ${activeTab === t.key ? 'ud-tab-active' : ''}`}
            onClick={() => setActiveTab(t.key as any)}
          >
            {t.label}
            {t.badge != null && <span className="ud-tab-badge">{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Error banner ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="ud-error-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError(null)}><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <div className="ud-content">

        {/* CURRENT RIDE TAB */}
        {activeTab === 'current' && (
          <div>
            {loadingRide ? (
              <div className="ud-loading">
                <Loader2 size={24} className="ud-spin" />
                <p>Loading your ride…</p>
              </div>
            ) : activeRide ? (
              <>
                <ActiveRideCard
                  ride={activeRide}
                  onCancel={() => setShowCancelModal(true)}
                  onRefresh={loadActiveRide}
                />
                <AnimatePresence>
                  {showCancelModal && (
                    <CancelModal
                      onConfirm={handleCancelRide}
                      onClose={() => setShowCancelModal(false)}
                      loading={cancelLoading}
                    />
                  )}
                </AnimatePresence>
              </>
            ) : (
              <motion.div
                className="ud-empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Car size={48} className="ud-empty-icon" />
                <h3>No Active Ride</h3>
                <p>You don't have any ongoing rides. Ready to go somewhere?</p>
                <Link to="/book" className="ud-book-btn ud-book-btn-lg">
                  Book a Ride <ChevronRight size={16} />
                </Link>
              </motion.div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="ud-card">
            <div className="ud-card-head">
              <div>
                <p className="ud-card-label">All Trips</p>
                <h3 className="ud-card-title">Ride History</h3>
              </div>
              <button className="ud-btn-ghost" onClick={loadHistory}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            {loadingHistory ? (
              <div className="ud-loading"><Loader2 size={20} className="ud-spin" /><p>Loading history…</p></div>
            ) : rideHistory.length === 0 ? (
              <div className="ud-empty-sm">
                <History size={32} className="ud-empty-icon" />
                <p>No ride history yet.</p>
              </div>
            ) : (
              <div className="ud-history-list">
                {rideHistory.map(ride => (
                  <RideHistoryRow key={ride._id} ride={ride} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="ud-card">
            <div className="ud-card-head">
              <div>
                <p className="ud-card-label">Updates</p>
                <h3 className="ud-card-title">Notifications</h3>
              </div>
              {unreadCount > 0 && (
                <button className="ud-btn-ghost" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="ud-empty-sm">
                <Bell size={32} className="ud-empty-icon" />
                <p>No notifications yet.</p>
              </div>
            ) : (
              <div className="ud-notif-list">
                {notifications.map(n => (
                  <div key={n.id} className={`ud-notif-row ${!n.read ? 'ud-notif-unread' : ''}`}>
                    <div className={`ud-notif-dot ud-dot-${n.type}`} />
                    <div className="ud-notif-content">
                      <div className="ud-notif-title">{n.title}</div>
                      <div className="ud-notif-body">{n.body}</div>
                      <div className="ud-notif-time">
                        <Clock size={10} /> {new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {!n.read && <div className="ud-notif-badge" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADMIN TAB */}
        {activeTab === 'admin' && user?.role === 'admin' && (
          <div className="ud-card">
            <div className="ud-card-head">
              <div>
                <p className="ud-card-label">System Control</p>
                <h3 className="ud-card-title">All Platform Bookings</h3>
              </div>
              <button className="ud-btn-ghost" onClick={loadAdminRides}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {['all', 'searching', 'assigned', 'rider_arriving', 'rider_arrived', 'in_progress', 'completed', 'cancelled'].map(f => (
                <button
                  key={f}
                  onClick={() => setAdminFilter(f)}
                  style={{
                    background: adminFilter === f ? '#6B9E72' : 'rgba(255,255,255,0.06)',
                    color: adminFilter === f ? '#fff' : 'rgba(245,240,232,0.7)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {f === 'all' ? 'All Rides' : f.replace('_', ' ')}
                </button>
              ))}
            </div>

            {adminLoading ? (
              <div className="ud-loading"><Loader2 size={20} className="ud-spin" /><p>Loading system rides…</p></div>
            ) : adminRides.length === 0 ? (
              <div className="ud-empty-sm">
                <Car size={32} className="ud-empty-icon" />
                <p>No rides match filter.</p>
              </div>
            ) : (
              <div className="ud-history-list">
                {adminRides.map(r => (
                  <div key={r._id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#6B9E72', fontWeight: 700 }}>{r.bookingId}</span>
                      <span className="ud-status-badge" style={{ fontSize: '11px', padding: '2px 8px' }}>{r.status}</span>
                    </div>
                    <div style={{ fontSize: '13px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <strong>Passenger:</strong> {r.customerName || r.customerId?.name || 'Customer'}
                      <span className="ud-sep">|</span>
                      <strong>Driver:</strong> {r.driverName || r.driverId?.name || 'Unassigned'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.6)' }}>
                      📍 {r.pickup?.address} → 🏁 {r.drop?.address}
                    </div>
                    <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: 'rgba(245,240,232,0.5)' }}>
                      <span>{r.vehicleType} · {r.distanceKm} km</span>
                      <strong style={{ color: '#6B9E72', fontSize: '14px' }}>₹{r.actualFare || r.estimatedFare}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
