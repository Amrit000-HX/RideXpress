/**
 * BookRide.tsx — "Stacking Cards" vehicle selector
 * Each vehicle card is sticky at top; next card slides over the previous
 * like a deck of cards as the user scrolls.
 * Palette: Cream #F5F0E8 · Sage-Green #6B9E72 · Charcoal #1A1A1A
 */
import { useRef, useState, useEffect } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Clock, Users, ArrowRight,
  ChevronDown,
} from 'lucide-react'
import MapPicker, { type LocationData } from '../components/MapPicker/MapPicker'
import './BookRide.css'

import imgScooty from '../assets/veh_scooty.png'
import imgBike   from '../assets/veh_bike.png'
import imgCar    from '../assets/veh_car.png'
import imgJeep   from '../assets/veh_jeep.png'
import imgSuv    from '../assets/veh_suv.png'

/* ── Types ──────────────────────────────────────────── */
interface Vehicle {
  id: string; num: string; type: string; tagline: string
  price: number; priceUnit: string; eta: string; capacity: number
  features: string[]; services: string[]
  img: string | null
  theme: 'cream' | 'dark' | 'green'
}

/* ── Vehicle Data ───────────────────────────────────── */
const vehicles: Vehicle[] = [
  {
    id: 'scooty', num: '01', type: 'Scooty', tagline: 'Budget City Commute',
    price: 45, priceUnit: '/km', eta: '3–5 min', capacity: 1,
    features: ['Eco-friendly', 'Traffic slipper', 'Budget pick', 'No AC'],
    services: ['Rapido', 'RideXpress'],
    img: imgScooty, theme: 'cream',
  },
  {
    id: 'bike', num: '02', type: 'Moto', tagline: 'Quick Urban Rides',
    price: 60, priceUnit: '/km', eta: '4–6 min', capacity: 1,
    features: ['Ultra-fast', 'Helmet included', 'All lanes', 'Affordable'],
    services: ['Rapido', 'OLA', 'RideXpress'],
    img: imgBike, theme: 'dark',
  },
  {
    id: 'auto', num: '03', type: 'Auto', tagline: 'Classic 3-Wheeler',
    price: 80, priceUnit: '/km', eta: '5–8 min', capacity: 3,
    features: ['3 passengers', 'Open air', 'City roads', 'Metered fare'],
    services: ['OLA Auto', 'Rapido Auto', 'RideXpress'],
    img: null, theme: 'green',
  },
  {
    id: 'hatch', num: '04', type: 'Hatchback', tagline: 'Compact & Comfortable',
    price: 180, priceUnit: '/km', eta: '4–7 min', capacity: 4,
    features: ['AC included', '4 passengers', 'Music system', 'City & highway'],
    services: ['OLA Mini', 'Uber Go', 'RideXpress'],
    img: imgCar, theme: 'cream',
  },
  {
    id: 'sedan', num: '05', type: 'Sedan', tagline: 'Premium Daily Ride',
    price: 250, priceUnit: '/km', eta: '3–6 min', capacity: 4,
    features: ['Full AC', 'Pro driver', 'USB charging', 'Extra legroom'],
    services: ['OLA Prime', 'Uber Premier', 'RideXpress'],
    img: imgCar, theme: 'dark',
  },
  {
    id: 'suv', num: '06', type: 'XL SUV', tagline: 'Space & Comfort',
    price: 400, priceUnit: '/km', eta: '6–10 min', capacity: 6,
    features: ['6 seats', 'Full AC', 'Family trips', 'Highway ready'],
    services: ['OLA XL', 'Uber XL', 'RideXpress'],
    img: imgSuv, theme: 'green',
  },
  {
    id: 'jeep', num: '07', type: 'Jeep', tagline: 'Adventure & Terrain',
    price: 500, priceUnit: '/km', eta: '8–12 min', capacity: 4,
    features: ['Off-road', '4WD option', 'Mountain ready', 'Rugged build'],
    services: ['RideXpress Premium'],
    img: imgJeep, theme: 'cream',
  },
  {
    id: 'bus', num: '08', type: 'Mini Bus', tagline: 'Groups & Events',
    price: 1200, priceUnit: '/trip', eta: '15–20 min', capacity: 14,
    features: ['14 seats', 'Corporate travel', 'Events & tours', 'Group discount'],
    services: ['RideXpress Groups'],
    img: null, theme: 'dark',
  },
]

/* ── Theme tokens ───────────────────────────────────── */
const themeMap = {
  cream: {
    bg: '#F5F0E8', text: '#1A1A1A', sub: 'rgba(26,26,26,0.5)',
    accent: '#6B9E72', border: 'rgba(26,26,26,0.12)',
    chip: 'rgba(26,26,26,0.07)', chipText: 'rgba(26,26,26,0.65)',
    btn: '#1A1A1A', btnText: '#F5F0E8',
    imgBg: 'rgba(107,158,114,0.06)',
  },
  dark: {
    bg: '#1A1A1A', text: '#F5F0E8', sub: 'rgba(245,240,232,0.45)',
    accent: '#6B9E72', border: 'rgba(245,240,232,0.1)',
    chip: 'rgba(245,240,232,0.06)', chipText: 'rgba(245,240,232,0.55)',
    btn: '#F5F0E8', btnText: '#1A1A1A',
    imgBg: 'rgba(107,158,114,0.08)',
  },
  green: {
    bg: '#6B9E72', text: '#1A1A1A', sub: 'rgba(26,26,26,0.55)',
    accent: '#1A1A1A', border: 'rgba(26,26,26,0.15)',
    chip: 'rgba(26,26,26,0.08)', chipText: 'rgba(26,26,26,0.6)',
    btn: '#1A1A1A', btnText: '#F5F0E8',
    imgBg: 'rgba(26,26,26,0.06)',
  },
}

/* ── Individual Vehicle Card ────────────────────────── */
function VehicleCard({
  vehicle, index, total, scrollYProgress, onSelect,
}: {
  vehicle: Vehicle; index: number; total: number
  scrollYProgress: any; onSelect: (v: Vehicle) => void
}) {
  const t = themeMap[vehicle.theme]
  const start = index / total
  const end   = (index + 1) / total
  const isLast = index === total - 1

  /* slide in from bottom — first card is always at 0%
     Slide window: 0.12 of total progress so cards rise clearly  */
  const slideWindow = 0.12
  const y = useTransform(
    scrollYProgress,
    index === 0
      ? [0, 1]
      : [Math.max(0, start - slideWindow), start],
    index === 0 ? ['0%', '0%'] : ['100%', '0%'],
  )

  /* scale down as next card arrives */
  const scale = useTransform(
    scrollYProgress,
    [Math.max(0, end - 0.005), Math.min(end + 0.10, 0.999)],
    [1, isLast ? 1 : 0.93],
  )

  /* border-radius appears when pushed behind */

  const borderRadius = useTransform(
    scrollYProgress,
    [end, Math.min(end + 0.07, 1)],
    [0, isLast ? 0 : 24],
  )

  return (
    <motion.div
      style={{
        position: 'absolute', inset: 0,
        y, scale, borderRadius,
        zIndex: index + 1,
        overflow: 'hidden',
        background: t.bg,
      }}
    >
      {/* Main split layout */}
      <div className="bk-card-grid">

        {/* ── LEFT: Info ── */}
        <div className="bk-card-left">
          {/* Top metadata row */}
          <div className="bk-card-toprow">
            <span className="bk-card-num" style={{ color: t.accent }}>{vehicle.num}</span>
            <div className="bk-card-badges">
              <span className="bk-badge" style={{ color: t.sub, borderColor: t.border }}>
                <Clock size={10} strokeWidth={2.5} /> {vehicle.eta}
              </span>
              <span className="bk-badge" style={{ color: t.sub, borderColor: t.border }}>
                <Users size={10} strokeWidth={2.5} /> {vehicle.capacity}p
              </span>
            </div>
          </div>

          {/* Giant vehicle name */}
          <h2 className="bk-card-name" style={{ color: t.text }}>
            {vehicle.type.toUpperCase()}
          </h2>
          <p className="bk-card-tagline" style={{ color: t.sub }}>
            {vehicle.tagline}
          </p>

          {/* Price */}
          <div className="bk-price-row">
            <span className="bk-price" style={{ color: t.text }}>
              ₹{vehicle.price.toLocaleString('en-IN')}
            </span>
            <span className="bk-price-unit" style={{ color: t.accent }}>
              {vehicle.priceUnit}
            </span>
          </div>

          {/* Features */}
          <div className="bk-features">
            {vehicle.features.map(f => (
              <span key={f} className="bk-chip"
                style={{ background: t.chip, color: t.chipText, borderColor: t.border }}>
                {f}
              </span>
            ))}
          </div>

          {/* Available via */}
          <div className="bk-services" style={{ color: t.sub, borderColor: t.border }}>
            <span className="bk-svc-label">Via</span>
            {vehicle.services.map(s => (
              <span key={s} className="bk-svc-tag"
                style={{ color: t.text, background: t.chip, borderColor: t.border }}>
                {s}
              </span>
            ))}
          </div>

          {/* CTA */}
          <button
            className="bk-select-btn"
            style={{ background: t.btn, color: t.btnText }}
            onClick={() => onSelect(vehicle)}
          >
            Select {vehicle.type}
            <ArrowRight size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ── RIGHT: Image ── */}
        <div className="bk-card-right" style={{ background: t.imgBg }}>
          {vehicle.img ? (
            <img
              src={vehicle.img} alt={vehicle.type}
              className="bk-vehicle-img"
            />
          ) : (
            <div className="bk-no-img" style={{ color: t.text, borderColor: t.border }}>
              <span className="bk-no-img-char" style={{ color: t.accent }}>
                {vehicle.type[0]}
              </span>
              <span className="bk-no-img-label" style={{ color: t.sub }}>
                {vehicle.type}
              </span>
            </div>
          )}

          {/* Large watermark number */}
          <div className="bk-watermark" style={{ color: t.text }}>{vehicle.num}</div>
        </div>
      </div>

      {/* ── Progress strip at bottom ── */}
      <div className="bk-progress-strip" style={{ borderTopColor: t.border }}>
        <span className="bk-prog-label" style={{ color: t.sub }}>
          {index + 1} / {total} — Scroll to explore
          <ChevronDown size={12} />
        </span>
        <div className="bk-prog-dots">
          {vehicles.map((_, i) => (
            <div
              key={i}
              className="bk-prog-dot"
              style={{
                background: i === index ? t.accent : t.border,
                opacity: i === index ? 1 : 0.5,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Fixed Side Indicator (right edge) ─────────────── */
function SideIndicator({ vehicles, scrollYProgress }: { vehicles: Vehicle[], scrollYProgress: any }) {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const unsub = scrollYProgress.on('change', (v: number) => {
      setActive(Math.min(Math.floor(v * vehicles.length), vehicles.length - 1))
    })
    return unsub
  }, [scrollYProgress, vehicles.length])

  return (
    <div className="bk-side-indicator">
      {vehicles.map((v, i) => (
        <div key={v.id} className={`bk-side-item ${i === active ? 'bk-side-active' : ''}`}>
          <div className="bk-side-dot" style={{
            background: i === active ? '#6B9E72' : 'rgba(245,240,232,0.2)',
          }} />
          {i === active && (
            <motion.span
              className="bk-side-label"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
            >
              {v.type}
            </motion.span>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────── */
export default function BookRide() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected]       = useState<Vehicle | null>(null)
  const [pickupLoc, setPickupLoc]     = useState<LocationData | null>(null)
  const [dropLoc, setDropLoc]         = useState<LocationData | null>(null)
  const [distanceKm, setDistanceKm]   = useState<number | null>(null)
  const [fare, setFare]               = useState<number | null>(null)

  /* Auth guard */
  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { state: { from: '/book' } })
  }, [isAuthenticated, navigate])

  useEffect(() => { window.scrollTo(0, 0) }, [])

  /*
   * Manual scroll progress tracking.
   * useScroll({ target }) is unreliable when the section is preceded by
   * other content — the offset anchor calculation drifts.
   * Instead: read getBoundingClientRect() on every scroll event for
   * an exact absolute top, then derive a 0→1 progress value.
   */
  const scrollYProgress = useMotionValue(0)

  useEffect(() => {
    const update = () => {
      const el = containerRef.current
      if (!el) return
      // getBoundingClientRect().top is relative to viewport; add scrollY for absolute pos
      const absTop = el.getBoundingClientRect().top + window.scrollY
      const elHeight = el.offsetHeight          // = vehicles.length × 100vh
      const vh      = window.innerHeight         // actual viewport height
      // progress 0 when section top hits viewport top; 1 when section bottom hits viewport bottom
      const raw = (window.scrollY - absTop) / (elHeight - vh)
      scrollYProgress.set(Math.max(0, Math.min(1, raw)))
    }
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize',  update)
    // Delay slightly so layout is settled after first render
    const t = setTimeout(update, 50)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize',  update)
      clearTimeout(t)
    }
  }, [scrollYProgress])

  const handleConfirm = () => {
    if (!selected) return

    const rideData = {
      bookingId: `RX-RIDE-${Math.floor(100000 + Math.random() * 900000)}`,
      customerName: user?.name || 'Customer',
      customerEmail: user?.email || 'customer@ridexpress.com',
      customerPhone: user?.phone || '+91 98765 43210',
      pickupAddress: pickupLoc?.address || 'Current Location (GPS), Main Road',
      dropAddress: dropLoc?.address || 'Selected Destination, Sector 5',
      vehicleType: selected.type,
      vehicleImage: selected.img,
      distanceKm: distanceKm || 5.8,
      totalFare: fare || (selected.price * 5),
      driverName: 'Arjun Mehta',
      driverPhone: '+91 98451 23098',
      driverVehicleNumber: 'MH 02 EQ 8492',
      driverRating: 4.94,
      startRidePin: Math.floor(1000 + Math.random() * 9000).toString(),
      paymentMethod: 'Cash on Delivery / UPI',
      bookedAt: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    }

    setSelected(null)
    navigate('/ride-receipt', { state: rideData })
  }

  if (!isAuthenticated) return null

  return (
    <div className="bk-page">

      {/* Page intro — scrolls away naturally */}
      <div className="bk-page-intro">
        <span className="bk-intro-label">Book a Ride</span>
        <h1 className="bk-intro-heading">Choose Your<br />Vehicle</h1>
        <p className="bk-intro-sub">
          Scroll through our fleet. Select the vehicle that fits your journey.
        </p>
        <div className="bk-scroll-hint">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown size={20} />
          </motion.div>
          <span>Scroll to explore</span>
        </div>
      </div>

      {/* ── Stacking cards outer container ── */}
      <div
        ref={containerRef}
        style={{ height: `${vehicles.length * 100}vh` }}
      >
        {/* Sticky viewport — cards are layered inside */}
        <div className="bk-sticky-viewport">
          {vehicles.map((v, i) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              index={i}
              total={vehicles.length}
              scrollYProgress={scrollYProgress}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      {/* Fixed side progress indicator */}
      <SideIndicator vehicles={vehicles} scrollYProgress={scrollYProgress} />

      {/* Full-Window Interactive Map Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="map-fullwindow"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <MapPicker
              vehicleType={selected.type}
              vehiclePrice={selected.price}
              vehiclePriceUnit={selected.priceUnit}
              vehicleEta={selected.eta}
              onClose={() => setSelected(null)}
              onConfirm={handleConfirm}
              onPickupChange={setPickupLoc}
              onDropChange={setDropLoc}
              onDistanceChange={(km, f) => {
                setDistanceKm(km)
                setFare(f)
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
