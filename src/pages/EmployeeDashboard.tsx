/**
 * EmployeeDashboard.tsx
 * Cinematic Noir aesthetic × RideXpress Cream/Green/Charcoal palette.
 * Dark surfaces · Cream text · Green accents · Grain overlay · Heavy type
 */
import { useState, useRef, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../contexts/SocketContext'
import {
  Package, Car, Clock, Star, Bell, AlertCircle,
  ArrowRight, MapPin, Zap, LogOut, Truck, ChevronRight,
  BarChart3, Navigation, Timer, CalendarDays,
  CircleDot, ArrowUpRight, Wallet, BadgeAlert,
  X, Check, MessageSquare,
} from 'lucide-react'
import {
  acceptRideBooking,
  rejectRideBooking,
  cancelRideBooking,
  markDriverArrived,
  startRideBooking,
  completeRideBooking,
  getDriverRideHistory,
  getDriverActiveRide,
  getAvailableRides,
  setDriverOnlineStatus,
  getDriverOnlineStatus,
  updateDriverLocation,
} from '../services/rideService'
import ChatBox from '../components/ChatBox'
import './EmployeeDashboard.css'

/* ════════════════════════════════════════════
   MOCK DATA
   ════════════════════════════════════════════ */

const TODAY_DELIVERIES = [
  { id: 'DEL-2847', type: 'delivery', from: 'Andheri West', to: 'Bandra Kurla Complex', status: 'in-progress', priority: 'high',   timeWindow: '10:00 – 11:30 AM', earning: 185, detail: 'Electronics · 2.5 kg' },
  { id: 'RID-1923', type: 'ride',     from: 'Juhu Beach',   to: 'CSIA Terminal 2',      status: 'assigned',    priority: 'normal', timeWindow: '11:45 AM – 12:30 PM', earning: 420, detail: '2 passengers' },
  { id: 'DEL-2903', type: 'delivery', from: 'Lower Parel',  to: 'Worli Sea Face',       status: 'pending',     priority: 'low',    timeWindow: '02:00 – 03:30 PM', earning: 95,  detail: 'Documents · 0.8 kg' },
]

const PENDING_LIST = [
  { id: 'DEL-2910', type: 'delivery', from: 'Goregaon', to: 'Malad',     timeWindow: '04:00 PM', earning: 110, priority: 'normal' },
  { id: 'RID-1944', type: 'ride',     from: 'Powai',    to: 'Vikhroli',  timeWindow: '05:15 PM', earning: 175, priority: 'low' },
  { id: 'DEL-2915', type: 'delivery', from: 'Dadar',    to: 'Matunga',   timeWindow: '06:00 PM', earning: 85,  priority: 'normal' },
]

const COMPLETED_LIST = [
  { id: 'RID-1901', type: 'ride',     from: 'Dadar',       to: 'Santacruz', completedAt: '8:42 AM',  earning: 210, rating: 5 },
  { id: 'RID-1907', type: 'ride',     from: 'Churchgate',  to: 'Bandra',    completedAt: '9:40 AM',  earning: 295, rating: 4 },
  { id: 'DEL-2832', type: 'delivery', from: 'Andheri',     to: 'Jogeshwari',completedAt: '10:55 AM', earning: 130, rating: 5 },
  { id: 'RID-1918', type: 'ride',     from: 'Marine Lines', to: 'Andheri',  completedAt: '12:10 PM', earning: 340, rating: 5 },
]

const FAILED_LIST = [
  { id: 'DEL-2798', type: 'delivery', from: 'Kurla',    to: 'Ghatkopar', failedAt: '9:20 AM', reason: 'Recipient not available', earning: 0 },
]

const UPCOMING_RIDES = [
  { id: 'RID-2001', from: 'Powai Lake', to: 'Fort, Mumbai',  distance: '24 km', earning: 380, timeLabel: 'In 35 min', passengers: 1 },
  { id: 'RID-2008', from: 'Kharghar',   to: 'Vashi CBD',    distance: '8 km',  earning: 140, timeLabel: 'In 1 hr 20 min', passengers: 2 },
  { id: 'RID-2014', from: 'Dadar TT',   to: 'Churchgate',   distance: '12 km', earning: 220, timeLabel: 'In 2 hrs', passengers: 1 },
]

const COMPLETED_RIDES_FULL = [
  { id: 'RID-1901', from: 'Dadar',       to: 'Santacruz',  date: 'Today, 8:15 AM',  duration: '28 min', earning: 210, rating: 5 },
  { id: 'RID-1907', from: 'Churchgate',  to: 'Bandra',     date: 'Today, 9:05 AM',  duration: '35 min', earning: 295, rating: 4 },
  { id: 'RID-1918', from: 'Marine Lines',to: 'Andheri',    date: 'Today, 11:10 AM', duration: '42 min', earning: 340, rating: 5 },
  { id: 'RID-1880', from: 'Powai',       to: 'Vikhroli',   date: 'Yesterday',       duration: '25 min', earning: 175, rating: 5 },
  { id: 'RID-1867', from: 'Goregaon',    to: 'Borivali',   date: 'Yesterday',       duration: '18 min', earning: 130, rating: 4 },
]

const NOTIFICATIONS = [
  { id: 1, type: 'ride',     icon: Car,            color: 'green',  title: 'New Ride Request',         desc: 'Powai → Fort · 24 km · ₹380',                  time: '2 min ago',  unread: true },
  { id: 2, type: 'delivery', icon: Package,         color: 'green',  title: 'Delivery Confirmed',       desc: 'DEL-2832 successfully delivered at Jogeshwari',  time: '45 min ago', unread: true },
  { id: 3, type: 'payment',  icon: Wallet,          color: 'cream',  title: 'Payment Credited',         desc: '₹840 credited for last 3 completed trips',       time: '1 hr ago',   unread: false },
  { id: 4, type: 'alert',    icon: BadgeAlert,      color: 'amber',  title: 'Traffic Alert',            desc: 'Congestion on Western Express Highway — reroute', time: '2 hrs ago',  unread: false },
  { id: 5, type: 'system',   icon: Bell,            color: 'muted',  title: 'Shift Reminder',           desc: 'Your next shift starts tomorrow at 7:30 AM',     time: 'Yesterday',  unread: false },
]

const PRIORITY_QUEUE = [
  { id: 'DEL-2903', label: 'Documents Delivery',   from: 'Lower Parel', to: 'Worli',       timeWindow: '02:00 PM', priority: 'high',   earning: 95 },
  { id: 'RID-1923', label: 'Airport Ride',          from: 'Juhu Beach',  to: 'CSIA T2',     timeWindow: '11:45 AM', priority: 'medium', earning: 420 },
  { id: 'DEL-2910', label: 'Electronics Delivery',  from: 'Goregaon',    to: 'Malad',       timeWindow: '04:00 PM', priority: 'low',    earning: 110 },
]

/* ════════════════════════════════════════════
   SMALL HELPERS
   ════════════════════════════════════════════ */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    'in-progress': { label: 'In Progress', cls: 'ed-badge-green' },
    assigned:      { label: 'Assigned',    cls: 'ed-badge-cream' },
    pending:       { label: 'Pending',     cls: 'ed-badge-muted' },
    completed:     { label: 'Completed',   cls: 'ed-badge-green' },
    failed:        { label: 'Failed',      cls: 'ed-badge-red'   },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'ed-badge-muted' }
  return <span className={`ed-badge ${cls}`}>{label}</span>
}

function PriorityDot({ priority }: { priority: string }) {
  const cls = priority === 'high' ? 'ed-dot-red' : priority === 'medium' ? 'ed-dot-amber' : 'ed-dot-green'
  return <span className={`ed-prio-dot ${cls}`} />
}

function Stars({ count }: { count: number }) {
  return (
    <span className="ed-stars">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={10} fill={i <= count ? '#6B9E72' : 'transparent'} stroke={i <= count ? '#6B9E72' : '#444'} strokeWidth={1.5} />
      ))}
    </span>
  )
}

/* ════════════════════════════════════════════
   SECTION: TODAY'S DELIVERIES
   ════════════════════════════════════════════ */
function TodayDeliveries() {
  return (
    <motion.div
      className="ed-card"
      initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16,1,0.3,1] }}
    >
      <div className="ed-card-head">
        <div>
          <p className="ed-card-label">Assignments</p>
          <h3 className="ed-card-title">Today's Deliveries</h3>
        </div>
        <span className="ed-count-pill">{TODAY_DELIVERIES.length}</span>
      </div>

      <div className="ed-delivery-list">
        {TODAY_DELIVERIES.map((d, i) => (
          <motion.div
            key={d.id}
            className="ed-delivery-row"
            initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }}
          >
            <div className={`ed-delivery-icon ${d.type === 'ride' ? 'ed-icon-ride' : 'ed-icon-delivery'}`}>
              {d.type === 'ride' ? <Car size={16} strokeWidth={1.8} /> : <Package size={16} strokeWidth={1.8} />}
            </div>
            <div className="ed-delivery-info">
              <div className="ed-delivery-route">
                <span>{d.from}</span>
                <ArrowRight size={12} className="ed-route-arrow" />
                <span>{d.to}</span>
              </div>
              <div className="ed-delivery-meta">
                <Clock size={10} /> {d.timeWindow}
                <span className="ed-meta-sep">·</span>
                {d.detail}
              </div>
            </div>
            <div className="ed-delivery-right">
              <StatusBadge status={d.status} />
              <span className="ed-earning">₹{d.earning}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════
   SECTION: STATUS TABS (Pending/Completed/Failed)
   ════════════════════════════════════════════ */
function StatusTabs() {
  const [active, setActive] = useState<'pending' | 'completed' | 'failed'>('pending')
  const lists = { pending: PENDING_LIST, completed: COMPLETED_LIST, failed: FAILED_LIST }

  const tabs: { key: typeof active; label: string; count: number }[] = [
    { key: 'pending',   label: 'Pending',   count: PENDING_LIST.length },
    { key: 'completed', label: 'Completed', count: COMPLETED_LIST.length },
    { key: 'failed',    label: 'Failed',    count: FAILED_LIST.length },
  ]

  return (
    <motion.div
      className="ed-card"
      initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1, ease: [0.16,1,0.3,1] }}
    >
      <div className="ed-card-head">
        <div>
          <p className="ed-card-label">Overview</p>
          <h3 className="ed-card-title">Delivery Status</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="ed-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`ed-tab-btn ${active === t.key ? 'ed-tab-active' : ''}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
            <span className={`ed-tab-count ${active === t.key ? 'ed-tab-count-active' : ''}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="ed-tab-content"
        >
          {(lists[active] as any[]).map((item: any) => (
            <div key={item.id} className="ed-status-row">
              <div className={`ed-status-icon ${item.type === 'ride' ? 'ed-icon-ride' : 'ed-icon-delivery'}`}>
                {item.type === 'ride' ? <Car size={13} /> : <Package size={13} />}
              </div>
              <div className="ed-status-info">
                <span className="ed-status-id">{item.id}</span>
                <span className="ed-status-route">{item.from} → {item.to}</span>
                {active === 'completed' && item.completedAt && (
                  <span className="ed-status-time">✓ {item.completedAt}</span>
                )}
                {active === 'failed' && item.reason && (
                  <span className="ed-status-failed">{item.reason}</span>
                )}
                {active === 'pending' && item.timeWindow && (
                  <span className="ed-status-time">⏱ {item.timeWindow}</span>
                )}
              </div>
              <div className="ed-status-right">
                {active === 'completed' && item.rating && <Stars count={item.rating} />}
                {active === 'failed' ? (
                  <span className="ed-earning ed-earning-zero">₹0</span>
                ) : (
                  <span className="ed-earning">₹{item.earning}</span>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

/* ════════════════════════════════════════════
   SECTION: UPCOMING RIDES (Live Database & Socket Dispatch Feed)
   ════════════════════════════════════════════ */
function UpcomingRides({
  rides = [],
  onAccept,
  loadingId,
}: {
  rides?: any[]
  onAccept: (rideId: string) => void
  loadingId: string | null
}) {
  return (
    <motion.div
      className="ed-card"
      initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.15, ease: [0.16,1,0.3,1] }}
    >
      <div className="ed-card-head">
        <div>
          <p className="ed-card-label">Available Now</p>
          <h3 className="ed-card-title">Upcoming Rides</h3>
        </div>
        <Navigation size={18} className="ed-card-icon" />
      </div>

      <div className="ed-upcoming-list">
        {rides.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'rgba(245,240,232,0.45)', fontSize: '13px' }}>
            No pending ride requests at this moment. Bring your shift online to receive nearby passenger bookings.
          </div>
        ) : (
          rides.map((r) => {
            const rId = r.rideId || r._id || r.id
            const fromAddr = r.pickup?.address || r.from || 'Pickup point'
            const toAddr = r.drop?.address || r.to || 'Drop destination'
            const fare = r.estimatedFare || r.earning || 250
            const dist = r.distanceKm ? `${r.distanceKm} km` : (r.distance || '5.2 km')
            const pax = r.passengers || 1
            const time = r.timeLabel || 'Immediate'

            return (
              <motion.div
                key={rId}
                className="ed-upcoming-card"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ borderColor: 'rgba(107,158,114,0.35)' }}
              >
                <div className="ed-upcoming-left">
                  <div className="ed-upcoming-route">
                    <MapPin size={11} className="ed-green" /> {fromAddr.slice(0, 32)}
                  </div>
                  <div className="ed-upcoming-arrow">↓</div>
                  <div className="ed-upcoming-route">
                    <MapPin size={11} className="ed-cream" /> {toAddr.slice(0, 32)}
                  </div>
                </div>
                <div className="ed-upcoming-mid">
                  <span className="ed-upcoming-dist">{dist}</span>
                  <span className="ed-upcoming-pax">{pax} pax</span>
                  <span className="ed-upcoming-time">{time}</span>
                </div>
                <div className="ed-upcoming-right">
                  <span className="ed-upcoming-fare">₹{fare}</span>
                  <button
                    className="ed-accept-btn"
                    onClick={() => onAccept(rId)}
                    disabled={loadingId === 'accept'}
                  >
                    {loadingId === 'accept' ? '…' : <>Accept <ChevronRight size={12} /></>}
                  </button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════
   SIDEBAR: CURRENT SHIFT & LIVE GPS BROADCASTER
   ════════════════════════════════════════════ */
function ShiftCard({
  vehicleCategory = 'Scooty',
  isOnline,
  onToggleOnline,
  onlineLoading,
  gpsCoords,
  pingCount,
}: {
  vehicleCategory?: string
  isOnline: boolean
  onToggleOnline: () => void
  onlineLoading: boolean
  gpsCoords: { lat: number; lng: number } | null
  pingCount: number
}) {
  const { isConnected } = useSocket()
  const hoursWorked = isOnline ? 7.2 : 6.5
  const totalHours = 12
  const pct = (hoursWorked / totalHours) * 100

  return (
    <motion.div
      className={`ed-card ${isOnline ? 'ed-card-accent' : ''}`}
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.6 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="ed-card-label">Real-Time Dispatch</p>
          <h3 className="ed-card-title">Live Shift &amp; GPS</h3>
        </div>
        <button
          onClick={onToggleOnline}
          disabled={onlineLoading}
          style={{
            background: isOnline ? '#6B9E72' : '#2a2a2a',
            color: isOnline ? '#ffffff' : '#e0e0e0',
            border: isOnline ? 'none' : '1px solid rgba(255,255,255,0.15)',
            borderRadius: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: onlineLoading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#ffffff' : '#888888',
              boxShadow: isOnline ? '0 0 8px #ffffff' : 'none',
            }}
          />
          {onlineLoading ? 'Updating…' : isOnline ? 'ONLINE (Broadcasting)' : 'GO ONLINE'}
        </button>
      </div>

      {/* GPS Streaming status pill */}
      {isOnline && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{
            marginTop: '14px',
            padding: '10px 12px',
            background: 'rgba(107, 158, 114, 0.12)',
            border: '1px solid rgba(107, 158, 114, 0.3)',
            borderRadius: '10px',
            fontSize: '11.5px',
            color: '#c4e0c8',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <Navigation size={13} className="ed-green" />
            <span>GPS Broadcasting Active ({pingCount} pings sent)</span>
          </div>
          {gpsCoords && (
            <div style={{ fontFamily: 'monospace', fontSize: '10.5px', color: '#9ec4a2' }}>
              📍 {gpsCoords.lat.toFixed(5)}° N, {gpsCoords.lng.toFixed(5)}° E
            </div>
          )}
        </motion.div>
      )}

      <div className="ed-shift-time-row" style={{ marginTop: '16px' }}>
        <div className="ed-shift-slot">
          <span className="ed-shift-lbl">WebSocket</span>
          <span className="ed-shift-val" style={{ color: isConnected ? '#6B9E72' : '#e74c3c' }}>
            {isConnected ? '● Connected' : '○ Offline'}
          </span>
        </div>
        <Zap size={14} className="ed-green" />
        <div className="ed-shift-slot">
          <span className="ed-shift-lbl">Vehicle Fleet</span>
          <span className="ed-shift-val">{vehicleCategory}</span>
        </div>
      </div>

      <div className="ed-shift-progress-wrap">
        <div className="ed-shift-progress-track">
          <motion.div
            className="ed-shift-progress-fill"
            initial={{ width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16,1,0.3,1] }}
          />
        </div>
        <div className="ed-shift-progress-labels">
          <span>{hoursWorked} hrs shift elapsed</span>
          <span className="ed-muted">{totalHours} hrs max</span>
        </div>
      </div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════
   SIDEBAR: NOTIFICATIONS
   ════════════════════════════════════════════ */
function NotificationsPanel() {
  const colorMap: Record<string, string> = {
    green: 'ed-notif-green',
    cream: 'ed-notif-cream',
    amber: 'ed-notif-amber',
    muted: 'ed-notif-muted',
  }

  return (
    <motion.div
      className="ed-card"
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
    >
      <div className="ed-card-head">
        <div>
          <p className="ed-card-label">Activity</p>
          <h3 className="ed-card-title">Notifications</h3>
        </div>
        <span className="ed-notif-unread-count">2</span>
      </div>

      <div className="ed-notif-list">
        {NOTIFICATIONS.map((n, i) => {
          const Icon = n.icon
          return (
            <motion.div
              key={n.id}
              className={`ed-notif-item ${n.unread ? 'ed-notif-unread' : ''}`}
              initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <div className={`ed-notif-icon-wrap ${colorMap[n.color]}`}>
                <Icon size={13} strokeWidth={2} />
              </div>
              <div className="ed-notif-body">
                <div className="ed-notif-title">{n.title}</div>
                <div className="ed-notif-desc">{n.desc}</div>
                <div className="ed-notif-time">{n.time}</div>
              </div>
              {n.unread && <div className="ed-notif-dot" />}
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════
   SIDEBAR: PRIORITY QUEUE
   ════════════════════════════════════════════ */
function PriorityQueue() {
  return (
    <motion.div
      className="ed-card"
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
    >
      <div className="ed-card-head">
        <div>
          <p className="ed-card-label">Urgency</p>
          <h3 className="ed-card-title">Priority Queue</h3>
        </div>
        <AlertCircle size={16} className="ed-muted-icon" />
      </div>

      <div className="ed-priority-list">
        {PRIORITY_QUEUE.map((p, i) => (
          <motion.div
            key={p.id}
            className="ed-priority-item"
            initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <PriorityDot priority={p.priority} />
            <div className="ed-priority-info">
              <div className="ed-priority-label">{p.label}</div>
              <div className="ed-priority-route">{p.from} → {p.to}</div>
              <div className="ed-priority-window">
                <CalendarDays size={9} /> {p.timeWindow}
              </div>
            </div>
            <span className="ed-earning">₹{p.earning}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════
   SECTION: COMPLETED RIDES (horizontal scroll)
   ════════════════════════════════════════════ */
function CompletedRidesSection({ rides = [] }: { rides?: any[] }) {
  const displayRides = rides.length > 0
    ? rides.map(r => ({
        id: r.bookingId || r._id,
        from: r.pickup?.address?.slice(0, 24) || 'Pickup',
        to: r.drop?.address?.slice(0, 24) || 'Drop',
        date: new Date(r.completedAt || r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        duration: `${r.estimatedMinutes || 15} min`,
        earning: r.actualFare || r.estimatedFare || 250,
        rating: r.driverRating || 5,
      }))
    : COMPLETED_RIDES_FULL

  return (
    <motion.section
      className="ed-completed-section"
      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
      viewport={{ once: true }} transition={{ duration: 0.8 }}
    >
      <div className="ed-section-header">
        <div>
          <p className="ed-card-label">History</p>
          <h2 className="ed-section-title">Completed Rides</h2>
        </div>
        <button className="ed-view-all-btn">View All <ArrowUpRight size={14} /></button>
      </div>

      <div className="ed-completed-scroll">
        {displayRides.map((r, i) => (
          <motion.div
            key={r.id}
            className="ed-completed-card"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.06 }}
            whileHover={{ y: -4 }}
          >
            <div className="ed-completed-card-top">
              <span className="ed-completed-id">{r.id}</span>
              <Stars count={r.rating} />
            </div>
            <div className="ed-completed-route">
              <span className="ed-completed-from">{r.from}</span>
              <ArrowRight size={11} className="ed-route-arrow" />
              <span className="ed-completed-to">{r.to}</span>
            </div>
            <div className="ed-completed-meta">
              <CalendarDays size={10} /> {r.date}
            </div>
            <div className="ed-completed-card-bot">
              <span className="ed-completed-dur"><Timer size={10} /> {r.duration}</span>
              <span className="ed-completed-fare">₹{r.earning}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}

/* ════════════════════════════════════════════
   MAIN COMPONENT: EmployeeDashboard
   ════════════════════════════════════════════ */
export default function EmployeeDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const heroRef = useRef<HTMLDivElement>(null)

  const empName    = user?.name || localStorage.getItem('emp_name') || 'Employee'
  const empVehicle = user?.vehicleCategory || localStorage.getItem('emp_vehicle') || 'Express Fleet'
  const initials   = empName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase() || 'E'

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const nameScale   = useTransform(scrollYProgress, [0, 0.5], [1, 0.85])
  const bgScale     = useTransform(scrollYProgress, [0, 1],   [1, 1.18])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  const { socket, isConnected } = useSocket()
  const [incomingRequest, setIncomingRequest] = useState<any | null>(null)
  const [activeTrip, setActiveTrip]           = useState<any | null>(null)
  const [acceptTimer, setAcceptTimer]         = useState<number>(30)
  const [showDriverChat, setShowDriverChat]   = useState(false)
  const [driverRides, setDriverRides]         = useState<any[]>([])
  const [dbEarnings, setDbEarnings]           = useState<number>(0)
  const [tripStatus, setTripStatus]           = useState<string>('assigned')
  const [actionLoading, setActionLoading]     = useState<string | null>(null)
  const [isOnline, setIsOnline]               = useState<boolean>(false)
  const [onlineLoading, setOnlineLoading]     = useState<boolean>(false)
  const [availableRides, setAvailableRides]   = useState<any[]>([])
  const [gpsCoords, setGpsCoords]             = useState<{ lat: number; lng: number } | null>(null)
  const [pingCount, setPingCount]             = useState<number>(0)
  const savedDriverCoordsRef                  = useRef<{ lat: number; lng: number } | null>(null)

  const loadDriverHistory = async () => {
    try {
      const res = await getDriverRideHistory()
      if (res?.rides) {
        setDriverRides(res.rides)
        setDbEarnings(res.totalEarnings || 0)
      }
    } catch (err) {
      console.warn('Could not load driver ride history:', err)
    }
  }

  const loadActiveTrip = async () => {
    try {
      const ride = await getDriverActiveRide()
      if (ride) {
        setActiveTrip(ride)
        setTripStatus(ride.status)
      }
    } catch (err) {
      console.warn('Could not load active trip:', err)
    }
  }

  useEffect(() => {
    loadDriverHistory()
    loadActiveTrip()
    // Load persisted online status & saved location from DB — source of truth
    getDriverOnlineStatus().then((data) => {
      setIsOnline(data.onlineStatus === 'ONLINE')
      const lat = data.currentLocation?.lat ?? data.location?.coordinates?.[1]
      const lng = data.currentLocation?.lng ?? data.location?.coordinates?.[0]
      if (lat != null && lng != null) {
        savedDriverCoordsRef.current = { lat, lng }
        setGpsCoords({ lat, lng })
      }
    }).catch(() => {})

    getAvailableRides().then((rides) => {
      if (Array.isArray(rides)) setAvailableRides(rides)
    }).catch(() => {})
  }, [])

  // Listen for real-time ride matching requests from customers & unavailable broadcasts
  useEffect(() => {
    if (!socket || !isConnected) return

    const handleIncomingRequest = (data: any) => {
      setIncomingRequest(data)
      setAcceptTimer(30)
      setAvailableRides((prev) => {
        const reqId = data.rideId || data._id
        if (prev.some((r) => (r.rideId === reqId || r._id === reqId))) return prev
        return [data, ...prev]
      })
    }

    const handleNewAvailable = (data: any) => {
      setAvailableRides((prev) => {
        const reqId = data.rideId || data._id
        if (prev.some((r) => (r.rideId === reqId || r._id === reqId))) return prev
        return [data, ...prev]
      })
    }

    const handleRideUnavailable = (data: any) => {
      const uId = data?.rideId
      setIncomingRequest((prev: any) => {
        if (!prev) return null
        if (uId && (String(uId) === String(prev.rideId) || String(uId) === String(prev._id))) {
          return null
        }
        return prev
      })
      if (uId) {
        setAvailableRides((prev) => prev.filter((r) => String(r.rideId || r._id) !== String(uId)))
      }
    }

    const handleDriverAssignedRide = (ride: any) => {
      setActiveTrip(ride)
      setTripStatus(ride.status || 'assigned')
      setIncomingRequest(null)
      const rId = ride._id || ride.rideId
      if (rId) {
        setAvailableRides((prev) => prev.filter((r) => String(r.rideId || r._id) !== String(rId)))
        socket.emit('ride:join_room', { rideId: rId })
      }
      loadDriverHistory()
    }

    socket.on('ride:incoming_request', handleIncomingRequest)
    socket.on('ride:new_available', handleNewAvailable)
    socket.on('ride:unavailable', handleRideUnavailable)
    socket.on('driver:assigned_ride', handleDriverAssignedRide)

    return () => {
      socket.off('ride:incoming_request', handleIncomingRequest)
      socket.off('ride:new_available', handleNewAvailable)
      socket.off('ride:unavailable', handleRideUnavailable)
      socket.off('driver:assigned_ride', handleDriverAssignedRide)
    }
  }, [socket, isConnected])

  // 30-Second Countdown timer for incoming request
  useEffect(() => {
    if (!incomingRequest) return
    const interval = setInterval(() => {
      setAcceptTimer((t) => {
        if (t <= 1) {
          setIncomingRequest(null)
          return 30
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [incomingRequest])

  // ── GPS Polling Loop ──────────────────────────────────────────────────
  // Runs when driver is ONLINE + socket is connected.
  // Uses saved MongoDB coordinates as base to avoid jumping across the map.
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline || !socket || !isConnected) return

    let watchId:       number | null = null
    let tickInterval:  ReturnType<typeof setInterval> | null = null
    let tick           = 0
    let latestLat      = savedDriverCoordsRef.current?.lat || 0
    let latestLng      = savedDriverCoordsRef.current?.lng || 0
    let hasGeoFix      = false

    const pushLocation = (lat: number, lng: number, heading = 0, speed = 0) => {
      latestLat = lat
      latestLng = lng
      setGpsCoords({ lat, lng })
      setPingCount((p) => p + 1)

      // Primary: emit socket event (5 s interval)
      socket.emit('driver:location_update', {
        lat, lng, heading, speed,
        activeRideId: activeTrip?._id || activeTrip?.rideId || null,
      })

      // Fallback: REST call every 10 s (every 2nd tick) — persists even if socket drops
      tick++
      if (tick % 2 === 0) {
        updateDriverLocation(lat, lng, heading, speed).catch(() => {})
      }
    }

    if ('geolocation' in navigator) {
      // Real GPS — watch for continuous updates
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          hasGeoFix = true
          pushLocation(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.heading ?? 0,
            pos.coords.speed   ?? 0,
          )
        },
        () => { /* simulator fallback below */ },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 8000 },
      )
    }

    // Initial push immediately on coming online
    if (latestLat !== 0) {
      pushLocation(latestLat, latestLng)
    }

    // Tick every 5 s
    tickInterval = setInterval(() => {
      if (hasGeoFix && latestLat !== 0) {
        pushLocation(latestLat, latestLng)
      } else {
        // Use saved driver coordinates with small realistic drift (~10m)
        if (latestLat === 0) {
          latestLat = savedDriverCoordsRef.current?.lat || 19.0733
          latestLng = savedDriverCoordsRef.current?.lng || 83.8130
        }
        latestLat += (Math.random() - 0.5) * 0.0001
        latestLng += (Math.random() - 0.5) * 0.0001
        pushLocation(latestLat, latestLng)
      }
    }, 5000)

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
      if (tickInterval)     clearInterval(tickInterval)
    }
  }, [isOnline, socket, isConnected, activeTrip?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAcceptRide = async (rideIdToAccept?: string) => {
    const rId = rideIdToAccept || incomingRequest?.rideId || incomingRequest?._id
    if (!rId) return
    setActionLoading('accept')
    try {
      const res = await acceptRideBooking(rId)
      const rideData = res?.ride || incomingRequest || { _id: rId, rideId: rId, status: 'assigned' }
      setActiveTrip({ ...rideData, status: 'assigned' })
      setTripStatus('assigned')
      setIncomingRequest(null)
      setAvailableRides((prev) => prev.filter((r) => String(r.rideId || r._id) !== String(rId)))
      socket?.emit('ride:join_room', { rideId: rId })
    } catch (err: any) {
      console.error('Failed to accept ride:', err)
      const msg = err?.response?.data?.message || err?.message || 'This ride is no longer available or was accepted by another driver.'
      alert(msg)
      setIncomingRequest(null)
      setAvailableRides((prev) => prev.filter((r) => String(r.rideId || r._id) !== String(rId)))
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectRide = async () => {
    if (!incomingRequest) return
    const rId = incomingRequest.rideId || incomingRequest._id
    setActionLoading('reject')
    try {
      await rejectRideBooking(rId)
      setIncomingRequest(null)
      setAvailableRides((prev) => prev.filter((r) => String(r.rideId || r._id) !== String(rId)))
    } catch (err) {
      console.error('Failed to reject ride:', err)
      setIncomingRequest(null)
      setAvailableRides((prev) => prev.filter((r) => String(r.rideId || r._id) !== String(rId)))
    } finally {
      setActionLoading(null)
    }
  }

  const handleMarkArrived = async () => {
    if (!activeTrip) return
    setActionLoading('arrived')
    try {
      await markDriverArrived(activeTrip.rideId || activeTrip._id)
      setTripStatus('rider_arrived')
      setActiveTrip((prev: any) => ({ ...prev, status: 'rider_arrived' }))
    } catch (err) {
      console.error('Failed to mark arrived:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleStartRide = async () => {
    if (!activeTrip) return
    setActionLoading('start')
    try {
      await startRideBooking(activeTrip.rideId || activeTrip._id)
      setTripStatus('in_progress')
      setActiveTrip((prev: any) => ({ ...prev, status: 'in_progress' }))
    } catch (err) {
      console.error('Failed to start ride:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCompleteRide = async () => {
    if (!activeTrip) return
    setActionLoading('complete')
    try {
      await completeRideBooking(activeTrip.rideId || activeTrip._id)
      setActiveTrip(null)
      setTripStatus('assigned')
      setShowDriverChat(false)
      loadDriverHistory()
    } catch (err) {
      console.error('Failed to complete ride:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDriverCancelRide = async () => {
    if (!activeTrip) return
    const reason = window.prompt('Please enter a cancellation reason (e.g. Passenger no-show):', 'Passenger no-show')
    if (reason === null) return
    setActionLoading('cancel')
    try {
      await cancelRideBooking(activeTrip.rideId || activeTrip._id, reason || 'Driver cancelled')
      setActiveTrip(null)
      setShowDriverChat(false)
      loadDriverHistory()
    } catch (err) {
      console.error('Failed to cancel trip:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleGoOnline = async () => {
    setOnlineLoading(true)
    try {
      await setDriverOnlineStatus('ONLINE')
      setIsOnline(true)
      socket?.emit('driver:go_online', { vehicleType: empVehicle })
    } catch (err) {
      console.error('Failed to go online:', err)
    } finally {
      setOnlineLoading(false)
    }
  }

  const handleGoOffline = async () => {
    setOnlineLoading(true)
    try {
      await setDriverOnlineStatus('OFFLINE')
      setIsOnline(false)
      socket?.emit('driver:go_offline')
    } catch (err) {
      console.error('Failed to go offline:', err)
    } finally {
      setOnlineLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const todayEarnings = (dbEarnings > 0 ? dbEarnings : 0) +
    TODAY_DELIVERIES.reduce((s, d) => s + d.earning, 0) +
    COMPLETED_LIST.reduce((s, d) => s + d.earning, 0)

  return (
    <div className="ed-page">
      {/* ── Grain Overlay ── */}
      <div className="ed-grain" aria-hidden="true" />

      {/* ══════════════════════════════════════════════
          LIVE INCOMING RIDE REQUEST POPUP (Phase 3 Matching)
         ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {incomingRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                width: '100%',
                maxWidth: '460px',
                background: '#1A1A1A',
                border: '2px solid #6B9E72',
                borderRadius: '24px',
                padding: '28px',
                boxShadow: '0 20px 60px rgba(107, 158, 114, 0.35)',
                color: '#F5F0E8',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6B9E72', boxShadow: '0 0 10px #6B9E72' }} />
                  <span style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#6B9E72' }}>
                    New Match Request
                  </span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '12px', fontSize: '13px', fontWeight: 700 }}>
                  ⏱️ {acceptTimer}s left
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginBottom: '20px' }}>
                <div style={{ width: `${(acceptTimer / 30) * 100}%`, height: '100%', background: '#6B9E72', transition: 'width 1s linear' }} />
              </div>

              {/* Passenger & Fare Block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800 }}>{incomingRequest.customerName}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.6)' }}>{incomingRequest.vehicleType} · {incomingRequest.distanceKm} km trip</div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, color: '#6B9E72' }}>
                  ₹{incomingRequest.estimatedFare}
                </div>
              </div>

              {/* Route */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', paddingLeft: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6B9E72', marginTop: '5px' }} />
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B9E72', fontWeight: 700 }}>PICKUP POINT</div>
                    <div>{incomingRequest.pickup?.address}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e74c3c', marginTop: '5px' }} />
                  <div>
                    <div style={{ fontSize: '11px', color: '#e74c3c', fontWeight: 700 }}>DESTINATION</div>
                    <div>{incomingRequest.drop?.address}</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <button
                  onClick={handleRejectRide}
                  disabled={actionLoading === 'reject' || actionLoading === 'accept'}
                  style={{ padding: '14px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', opacity: actionLoading ? 0.7 : 1 }}
                >
                  {actionLoading === 'reject' ? '…' : 'Reject'}
                </button>
                <button
                  onClick={handleAcceptRide}
                  disabled={actionLoading === 'accept' || actionLoading === 'reject'}
                  style={{ padding: '14px', background: '#6B9E72', color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 8px 24px rgba(107, 158, 114, 0.4)', opacity: actionLoading ? 0.7 : 1 }}
                >
                  <Check size={18} strokeWidth={3} /> {actionLoading === 'accept' ? 'Accepting…' : 'ACCEPT RIDE'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          ACTIVE TRIP IN PROGRESS BANNER (Phase 3)
         ══════════════════════════════════════════════ */}
      {activeTrip && (
        <div style={{ background: '#1A1A1A', borderBottom: '2px solid #6B9E72', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#6B9E72', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Navigation size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#F5F0E8' }}>
                Active Trip in Progress — {activeTrip.customerName} (₹{activeTrip.estimatedFare})
              </div>
              <div style={{ fontSize: '12px', color: '#6B9E72' }}>
                📍 To: {activeTrip.drop?.address?.slice(0, 45)}… · Start PIN: {activeTrip.startRidePin}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowDriverChat((prev) => !prev)}
              style={{
                background: showDriverChat ? '#6B9E72' : 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(107, 158, 114, 0.4)',
                color: '#F5F0E8',
                borderRadius: '12px',
                padding: '9px 14px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <MessageSquare size={14} />
              <span>{showDriverChat ? 'Close Chat' : 'Chat'}</span>
            </button>

            {/* Arrived at pickup button — only when not yet arrived */}
            {(tripStatus === 'assigned' || tripStatus === 'rider_arriving') && (
              <button
                onClick={handleMarkArrived}
                disabled={!!actionLoading}
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)', borderRadius: '12px', padding: '9px 14px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', opacity: actionLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <MapPin size={13} /> {actionLoading === 'arrived' ? 'Marking…' : 'Arrived'}
              </button>
            )}

            {/* Start ride button — only after arrived */}
            {tripStatus === 'rider_arrived' && (
              <button
                onClick={handleStartRide}
                disabled={!!actionLoading}
                style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.35)', borderRadius: '12px', padding: '9px 14px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', opacity: actionLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <Navigation size={13} /> {actionLoading === 'start' ? 'Starting…' : 'Start Ride'}
              </button>
            )}

            {/* Complete button — only when in progress */}
            {tripStatus === 'in_progress' && (
              <button
                onClick={handleCompleteRide}
                disabled={!!actionLoading}
                style={{ background: '#6B9E72', color: '#fff', border: 'none', borderRadius: '12px', padding: '9px 16px', fontWeight: 800, fontSize: '12px', cursor: 'pointer', opacity: actionLoading ? 0.6 : 1 }}
              >
                {actionLoading === 'complete' ? 'Completing…' : 'Complete ✓'}
              </button>
            )}

            {/* Driver Cancel button */}
            <button
              onClick={handleDriverCancelRide}
              disabled={!!actionLoading}
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '12px', padding: '9px 12px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', opacity: actionLoading ? 0.6 : 1 }}
            >
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Driver In-App Chat Modal */}
      <AnimatePresence>
        {showDriverChat && activeTrip && (
          <ChatBox
            rideId={activeTrip.rideId || activeTrip._id}
            currentUserId={user?.id || 'driver-1'}
            currentUserName={empName}
            currentUserRole="driver"
            partnerName={activeTrip.customerName}
            onClose={() => setShowDriverChat(false)}
          />
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          HERO — cinematic profile section
         ══════════════════════════════════════════════ */}
      <div ref={heroRef} className="ed-hero">
        {/* Background */}
        <motion.div className="ed-hero-bg" style={{ scale: bgScale }} />

        {/* Minimal nav */}
        <div className="ed-hero-nav">
          <span className="ed-hero-logo">
            Ride<span className="ed-logo-x">X</span>press
          </span>
          <div className="ed-hero-nav-right">
            <span className="ed-hero-nav-label">Employee Portal</span>
            <button className="ed-logout-btn" onClick={handleLogout}>
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>

        {/* Content */}
        <motion.div className="ed-hero-content" style={{ opacity: heroOpacity }}>
          {/* Avatar */}
          <motion.div
            className="ed-avatar"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: 'spring', damping: 18 }}
          >
            {initials}
          </motion.div>

          {/* Vehicle badge */}
          <motion.p
            className="ed-hero-vehicle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <Truck size={13} strokeWidth={2} /> {empVehicle}
          </motion.p>

          {/* Huge name */}
          <div className="ed-hero-name-wrap">
            <motion.h1
              className="ed-hero-name"
              style={{ scale: nameScale }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.05, ease: [0.16,1,0.3,1] }}
            >
              {empName}
            </motion.h1>
          </div>

          {/* Sub-label */}
          <motion.p
            className="ed-hero-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.35 }}
          >
            Active Rider · RideXpress Partner Network
          </motion.p>

          {/* Quick stats strip */}
          <motion.div
            className="ed-hero-stats"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: [0.16,1,0.3,1] }}
          >
            {[
              { icon: Star,       value: '4.8',            label: 'Rating' },
              { icon: BarChart3,  value: '1,247',          label: 'Total Trips' },
              { icon: Wallet,     value: `₹${todayEarnings}`, label: "Today's Earnings" },
              { icon: CircleDot,  value: isOnline ? 'Online' : 'Offline', label: 'Shift Status' },
            ].map(({ icon: Icon, value, label }, i) => (
              <motion.div
                key={label}
                className="ed-stat-chip"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.07 }}
              >
                <Icon size={14} className="ed-stat-icon" strokeWidth={1.8} />
                <div>
                  <div className="ed-stat-val">{value}</div>
                  <div className="ed-stat-lbl">{label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Go Online / Offline Toggle ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          style={{ display: 'flex', justifyContent: 'center', paddingBottom: '32px', gap: '12px' }}
        >
          {isOnline ? (
            <button
              onClick={handleGoOffline}
              disabled={onlineLoading}
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '2px solid rgba(239,68,68,0.5)',
                color: '#ef4444',
                borderRadius: '50px',
                padding: '12px 28px',
                fontWeight: 800,
                fontSize: '14px',
                cursor: onlineLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                letterSpacing: '0.5px',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              {onlineLoading ? 'Going Offline…' : 'Go Offline'}
            </button>
          ) : (
            <button
              onClick={handleGoOnline}
              disabled={onlineLoading}
              style={{
                background: 'rgba(107,158,114,0.2)',
                border: '2px solid #6B9E72',
                color: '#6B9E72',
                borderRadius: '50px',
                padding: '12px 28px',
                fontWeight: 800,
                fontSize: '14px',
                cursor: onlineLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 0 20px rgba(107,158,114,0.3)',
                transition: 'all 0.2s',
                letterSpacing: '0.5px',
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6B9E72', boxShadow: '0 0 8px #6B9E72', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              {onlineLoading ? 'Going Online…' : 'Go Online'}
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(245,240,232,0.5)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#6B9E72' : '#ef4444', display: 'inline-block' }} />
            {isConnected ? 'Socket Connected' : 'Reconnecting…'}
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          className="ed-scroll-hint"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
        >
          <div className="ed-scroll-line" />
          <span>Scroll</span>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════
          MAIN DASHBOARD GRID
         ══════════════════════════════════════════════ */}
      <main className="ed-main">
        <div className="ed-grid">

          {/* LEFT: main content (2/3) */}
          <div className="ed-left">
            <TodayDeliveries />
            <StatusTabs />
            <UpcomingRides
              rides={availableRides}
              onAccept={handleAcceptRide}
              loadingId={actionLoading}
            />
          </div>

          {/* RIGHT: sidebar (1/3) */}
          <div className="ed-right">
            <ShiftCard
              vehicleCategory={empVehicle}
              isOnline={isOnline}
              onToggleOnline={isOnline ? handleGoOffline : handleGoOnline}
              onlineLoading={onlineLoading}
              gpsCoords={gpsCoords}
              pingCount={pingCount}
            />
            <NotificationsPanel />
            <PriorityQueue />
          </div>

        </div>

        {/* FULL WIDTH: Completed Rides */}
        <CompletedRidesSection rides={driverRides} />
      </main>
    </div>
  )
}
