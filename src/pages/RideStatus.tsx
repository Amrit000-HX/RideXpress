/**
 * RideStatus.tsx — Live Ride Status & Tracking Page
 * Real-time lifecycle: SEARCHING → ASSIGNED → EN ROUTE → ARRIVED → IN TRIP → COMPLETED
 * Palette: Cream #F5F0E8 · Sage #6B9E72 · Charcoal #1A1A1A
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import {
  Car, Clock, Star, Phone, MessageSquare,
  X, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft,
  ArrowRight, KeyRound, Loader2,
} from 'lucide-react'
import { getRideById, cancelRideBooking } from '../services/rideService'
import ChatBox from '../components/ChatBox'
import './RideStatus.css'

const CANCELLATION_REASONS = [
  'Driver taking too long to arrive',
  'Changed my mind',
  'Found alternative transport',
  'Pickup address entered incorrectly',
  'Emergency',
  'Other',
]

const STEPS = ['searching', 'assigned', 'rider_arriving', 'rider_arrived', 'in_progress', 'completed']
const STEP_LABELS = ['Searching', 'Accepted', 'En Route', 'Arrived', 'In Trip', 'Finished']

export default function RideStatus() {
  const { rideId } = useParams<{ rideId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { socket, isConnected } = useSocket()

  const [ride, setRide] = useState<any | null>(location.state?.ride || null)
  const [loading, setLoading] = useState(!ride)
  const [error, setError] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [searchSeconds, setSearchSeconds] = useState(0)

  // Timer for searching
  useEffect(() => {
    if (ride?.status !== 'searching' && ride?.status !== 'requested') return
    const interval = setInterval(() => {
      setSearchSeconds((s) => s + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [ride?.status])

  // Track whether we already have ride data without adding ride to deps
  const hasRideData = useRef(!!ride)
  useEffect(() => { hasRideData.current = !!ride }, [ride])

  // Fetch ride details — stable callback (no ride in deps)
  const fetchRide = useCallback(async () => {
    if (!rideId) return
    try {
      const data = await getRideById(rideId)
      if (data) setRide(data)
    } catch (err: any) {
      console.warn('Could not fetch ride:', err?.message)
      if (!hasRideData.current) setError('Could not load ride information.')
    } finally {
      setLoading(false)
    }
  }, [rideId])

  useEffect(() => {
    fetchRide()
  }, [fetchRide])

  // Join room & setup real-time socket listeners
  useEffect(() => {
    if (!socket || !isConnected || !rideId) return

    socket.emit('ride:join_room', { rideId })

    const handleStatusChange = (data: any) => {
      if (data.rideId === rideId || String(data.rideId) === String(ride?._id)) {
        setRide((prev: any) => (prev ? { ...prev, status: data.status, ...data } : prev))
      }
    }

    const handleAccepted = (data: any) => {
      setRide((prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          status: 'assigned',
          driverName: data.driver?.name || prev.driverName,
          driverPhone: data.driver?.phone || prev.driverPhone,
          driverVehicleNumber: data.driver?.vehicleNumber || prev.driverVehicleNumber,
          driverRating: data.driver?.rating || prev.driverRating,
          driver: data.driver || prev.driver,
        }
      })
    }

    const handleCancelled = (data: any) => {
      setRide((prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          status: 'cancelled',
          cancelledBy: data.cancelledBy,
          cancellationReason: data.reason,
        }
      })
    }

    const handleNoDriver = () => {
      setRide((prev: any) => (prev ? { ...prev, status: 'rejected' } : prev))
    }

    socket.on('ride:status_changed', handleStatusChange)
    socket.on('ride:accepted', handleAccepted)
    socket.on('ride:cancelled', handleCancelled)
    socket.on('ride:no_driver', handleNoDriver)

    // Polling fallback every 4s
    const pollInterval = setInterval(fetchRide, 4000)

    return () => {
      socket.emit('ride:leave_room', { rideId })
      socket.off('ride:status_changed', handleStatusChange)
      socket.off('ride:accepted', handleAccepted)
      socket.off('ride:cancelled', handleCancelled)
      socket.off('ride:no_driver', handleNoDriver)
      clearInterval(pollInterval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, rideId])

  const handleCancelSubmit = async () => {
    if (!ride) return
    try {
      setCancelLoading(true)
      await cancelRideBooking(ride._id || ride.id || rideId, cancelReason)
      setShowCancelModal(false)
      await fetchRide()
    } catch (err: any) {
      alert(err.message || 'Failed to cancel ride.')
    } finally {
      setCancelLoading(false)
    }
  }

  // Redirect to official receipt when completed
  const handleViewReceipt = () => {
    if (!ride) return
    const receiptData = {
      rideId: ride._id || ride.id,
      bookingId: ride.bookingId,
      customerName: ride.customerName || user?.name || 'Customer',
      customerEmail: ride.customerEmail || user?.email || '',
      customerPhone: ride.customerPhone || user?.phone || '',
      pickupAddress: ride.pickup?.address,
      dropAddress: ride.drop?.address,
      vehicleType: ride.vehicleType,
      distanceKm: ride.distanceKm,
      totalFare: ride.actualFare || ride.estimatedFare,
      driverName: ride.driverName || ride.driver?.name || 'Assigned Driver',
      driverPhone: ride.driverPhone || ride.driver?.phone || '+91 98451 23098',
      driverVehicleNumber: ride.driverVehicleNumber || ride.driver?.vehicleNumber || 'MH 02 EQ 8492',
      driverRating: ride.driverRating || 4.92,
      startRidePin: ride.startRidePin || '4821',
      paymentMethod: ride.paymentMethod || 'Cash on Delivery / UPI',
      bookedAt: new Date(ride.bookedAt || ride.createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    }
    navigate('/ride-receipt', { state: receiptData })
  }

  if (loading) {
    return (
      <div className="rs-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#c0dec4' }}>
          <Loader2 size={36} className="ud-spin" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: '15px' }}>Retrieving live ride status…</p>
        </div>
      </div>
    )
  }

  if (error || !ride) {
    return (
      <div className="rs-page">
        <div className="rs-container" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2>Ride Not Found</h2>
          <p style={{ color: 'rgba(245,240,232,0.6)', marginBottom: '24px' }}>
            {error || 'Unable to load trip status.'}
          </p>
          <Link to="/dashboard" className="rs-btn-invoice">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const status = ride.status || 'searching'
  const stepIdx = STEPS.indexOf(status)
  const canCancel = ['searching', 'requested', 'assigned', 'rider_arriving', 'rider_arrived'].includes(status)
  const canChat   = ['assigned', 'rider_arriving', 'rider_arrived', 'in_progress'].includes(status)
  const driverName = ride.driverName || ride.driver?.name || 'Arjun Mehta'
  const driverPhone = ride.driverPhone || ride.driver?.phone || '+91 98451 23098'
  const driverVeh = ride.driverVehicleNumber || ride.driver?.vehicleNumber || 'MH 02 EQ 8492'
  const driverRating = ride.driverRating || ride.driver?.rating || 4.92

  return (
    <div className="rs-page">
      <div className="rs-container">

        {/* ── Top Bar ── */}
        <div className="rs-topbar">
          <Link to="/dashboard" className="rs-back-btn">
            <ChevronLeft size={16} /> My Dashboard
          </Link>
          <div className="rs-top-meta">
            <span className="rs-booking-pill">{ride.bookingId}</span>
            <button className="rs-refresh-btn" onClick={fetchRide} title="Refresh Status">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            1. SEARCHING / RADAR STAGE
           ══════════════════════════════════════════════ */}
        {(status === 'searching' || status === 'requested') && (
          <motion.div
            className="rs-radar-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="rs-radar-animation">
              <div className="rs-radar-ring" />
              <div className="rs-radar-ring rs-ring-2" />
              <div className="rs-radar-ring rs-ring-3" />
              <div className="rs-radar-center">
                <Car size={26} />
              </div>
            </div>

            <h2 className="rs-radar-title">Finding Nearby Driver…</h2>
            <p className="rs-radar-sub">
              Scanning for available {ride.vehicleType} drivers within 5 km of your pickup point.
            </p>

            <div className="rs-radar-timer">
              <Clock size={13} />
              <span>Searching: {searchSeconds}s</span>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            2. ACTIVE / ASSIGNED / IN-TRIP / COMPLETED STAGES
           ══════════════════════════════════════════════ */}
        {status !== 'searching' && status !== 'requested' && (
          <motion.div
            className="rs-main-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Header tag */}
            <div className="rs-status-header">
              <span className={`rs-status-tag rs-tag-${status}`}>
                {status === 'assigned' && '● Driver Assigned'}
                {status === 'rider_arriving' && '● Driver En Route'}
                {status === 'rider_arrived' && '📍 Driver Arrived'}
                {status === 'in_progress' && '🚗 Trip In Progress'}
                {status === 'completed' && '✓ Ride Completed'}
                {status === 'cancelled' && '✕ Ride Cancelled'}
                {status === 'rejected' && '⚠ No Driver Found'}
                {status === 'expired' && '⏱ Search Timed Out'}
              </span>

              {status === 'in_progress' && (
                <span style={{ fontSize: '12px', color: '#6B9E72', fontWeight: 700 }}>
                  Live Road GPS Synchronized
                </span>
              )}
            </div>

            {/* Headline */}
            <h2 className="rs-status-headline">
              {status === 'assigned' && 'Your driver accepted the ride!'}
              {status === 'rider_arriving' && `${driverName} is on the way to you.`}
              {status === 'rider_arrived' && 'Your driver has arrived at the pickup location!'}
              {status === 'in_progress' && 'Heading towards your destination…'}
              {status === 'completed' && 'Trip Completed Successfully!'}
              {status === 'cancelled' && 'This ride was cancelled.'}
              {status === 'rejected' && 'No nearby drivers could accept.'}
              {status === 'expired' && 'No drivers available at this moment.'}
            </h2>

            <p className="rs-status-subtext">
              {status === 'assigned' && 'Driver is preparing to head towards your pickup location.'}
              {status === 'rider_arriving' && 'Please be ready at your pickup point.'}
              {status === 'rider_arrived' && 'Please board the vehicle and share the 4-digit PIN below.'}
              {status === 'in_progress' && `Relax while you travel to ${ride.drop?.address?.slice(0, 35)}…`}
              {status === 'completed' && 'Thank you for riding with RideXpress! Your receipt is ready.'}
              {status === 'cancelled' && `Reason: ${ride.cancellationReason || 'Cancelled by passenger/rider.'}`}
              {status === 'rejected' && 'All nearby drivers were occupied. Please try booking again.'}
              {status === 'expired' && 'All nearby drivers were occupied or timed out. Please try booking again.'}
            </p>

            {/* Stepper (for normal progressive rides) */}
            {!['cancelled', 'rejected', 'expired'].includes(status) && (
              <div className="rs-stepper">
                <div className="rs-step-connector" />
                {STEPS.map((s, idx) => {
                  const isDone = idx < stepIdx
                  const isActive = idx === stepIdx
                  return (
                    <div
                      key={s}
                      className={`rs-step-item ${isDone ? 'rs-step-done' : ''} ${isActive ? 'rs-step-active' : ''}`}
                    >
                      <div className="rs-step-circle">
                        {isDone ? <CheckCircle2 size={14} /> : idx + 1}
                      </div>
                      <span className="rs-step-label">{STEP_LABELS[idx]}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Driver Profile Card */}
            {['assigned', 'rider_arriving', 'rider_arrived', 'in_progress'].includes(status) && (
              <div className="rs-driver-box">
                <div className="rs-driver-left">
                  <div className="rs-driver-avatar">
                    {driverName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="rs-driver-name">
                      {driverName}
                      <span className="rs-driver-rating">
                        <Star size={11} fill="#f59e0b" color="#f59e0b" /> {driverRating}
                      </span>
                    </h3>
                    <div className="rs-driver-veh">
                      {ride.vehicleType} ·
                      <span className="rs-driver-plate">{driverVeh}</span>
                    </div>
                  </div>
                </div>

                <div className="rs-driver-actions">
                  <a href={`tel:${driverPhone}`} className="rs-btn-call" title="Call Driver">
                    <Phone size={17} />
                  </a>
                  <button
                    className="rs-btn-chat"
                    onClick={() => setShowChat((v) => !v)}
                  >
                    <MessageSquare size={15} />
                    <span>{showChat ? 'Close Chat' : 'Chat'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Start PIN Banner (prominent on arrival) */}
            {['assigned', 'rider_arriving', 'rider_arrived'].includes(status) && ride.startRidePin && (
              <div className="rs-pin-banner">
                <div className="rs-pin-left">
                  <KeyRound size={22} color="#f59e0b" />
                  <div>
                    <div className="rs-pin-title">Start Ride OTP PIN</div>
                    <div className="rs-pin-desc">Provide this 4-digit code to your driver upon boarding</div>
                  </div>
                </div>
                <div className="rs-pin-number">{ride.startRidePin}</div>
              </div>
            )}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            3. ROUTE & PRICING CARD
           ══════════════════════════════════════════════ */}
        <div className="rs-route-card">
          <div className="rs-route-row">
            <span className="rs-route-dot rs-dot-green" />
            <div>
              <div className="rs-route-title">PICKUP POINT</div>
              <div className="rs-route-addr">{ride.pickup?.address}</div>
            </div>
          </div>

          <div className="rs-route-line" />

          <div className="rs-route-row">
            <span className="rs-route-dot rs-dot-red" />
            <div>
              <div className="rs-route-title">DROP DESTINATION</div>
              <div className="rs-route-addr">{ride.drop?.address}</div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="rs-stats-strip">
            <div className="rs-stat-cell">
              <div className="rs-stat-cell-lbl">Distance</div>
              <div className="rs-stat-cell-val">{ride.distanceKm} km</div>
            </div>
            <div className="rs-stat-cell">
              <div className="rs-stat-cell-lbl">Fare</div>
              <div className="rs-stat-cell-val rs-stat-green">₹{ride.actualFare || ride.estimatedFare}</div>
            </div>
            <div className="rs-stat-cell">
              <div className="rs-stat-cell-lbl">Vehicle</div>
              <div className="rs-stat-cell-val">{ride.vehicleType}</div>
            </div>
            <div className="rs-stat-cell">
              <div className="rs-stat-cell-lbl">Payment</div>
              <div className="rs-stat-cell-val" style={{ fontSize: '11.5px' }}>{ride.paymentMethod || 'Cash / UPI'}</div>
            </div>
          </div>

          {ride.notes && (
            <div style={{ marginTop: '14px', fontSize: '12.5px', color: 'rgba(245,240,232,0.6)', fontStyle: 'italic' }}>
              Note for driver: "{ride.notes}"
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════
            4. ACTION CONTROLS FOOTER
           ══════════════════════════════════════════════ */}
        <div className="rs-footer-actions">
          {canCancel && (
            <button
              className="rs-btn-cancel"
              onClick={() => setShowCancelModal(true)}
            >
              <X size={16} /> Cancel Ride
            </button>
          )}

          {status === 'completed' && (
            <button className="rs-btn-invoice" onClick={handleViewReceipt}>
              View Official Bill & Invoice <ArrowRight size={16} />
            </button>
          )}

          {['cancelled', 'rejected', 'expired'].includes(status) && (
            <Link to="/book" className="rs-btn-invoice">
              Book Another Ride <ArrowRight size={16} />
            </Link>
          )}

          <Link to="/dashboard" className="rs-btn-book-new">
            View All My Rides
          </Link>
        </div>

      </div>

      {/* ── Cancel Modal ── */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="rs-modal-backdrop" onClick={() => setShowCancelModal(false)}>
            <div className="rs-modal" onClick={(e) => e.stopPropagation()}>
              <div className="rs-modal-head">
                <h3>Cancel Ride Request?</h3>
                <button className="rs-modal-close" onClick={() => setShowCancelModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <p style={{ fontSize: '13.5px', color: 'rgba(245,240,232,0.6)', margin: '0 0 14px' }}>
                Please choose a cancellation reason:
              </p>

              <div className="rs-reasons-list">
                {CANCELLATION_REASONS.map((r) => (
                  <button
                    key={r}
                    className={`rs-reason-item ${cancelReason === r ? 'rs-reason-active' : ''}`}
                    onClick={() => setCancelReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <div className="rs-modal-btns">
                <button className="rs-btn-keep" onClick={() => setShowCancelModal(false)}>
                  Keep Ride
                </button>
                <button
                  className="rs-btn-confirm-cancel"
                  disabled={!cancelReason || cancelLoading}
                  onClick={handleCancelSubmit}
                >
                  {cancelLoading ? 'Cancelling…' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Chat Modal ── */}
      <AnimatePresence>
        {showChat && canChat && (
          <ChatBox
            rideId={ride._id || ride.id || rideId || ''}
            currentUserId={user?.id || 'customer-1'}
            currentUserName={user?.name || 'Customer'}
            currentUserRole="customer"
            partnerName={driverName}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
