/**
 * DeliverParcel.tsx
 * Parcel delivery landing page — adapted from the Superdesign surrealist reference.
 * Style: dark surrealist layout (floating elements, parallax cards, scroll reveals)
 * Palette: Cream (#F5F0E8), Sage-Green (#6B9E72), Charcoal (#1A1A1A) — NO orange.
 * Two hero cards:
 *   Card 1 (Green)   — Delivery within 100 KM radius
 *   Card 2 (Charcoal) — Delivery 100 KM+ / different state / abroad
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Package, Globe, ArrowUpRight, ArrowRight,
  MapPin, Truck, ShieldCheck, Star,
  Clock, CheckCircle2, Zap,
} from 'lucide-react'
import './DeliverParcel.css'

/* ── Reveal hook (IntersectionObserver) ──────────────── */
function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('dp-active')
      }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )
    document.querySelectorAll('.dp-reveal').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}

/* ── Live clock ─────────────────────────────────────── */
function useLiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const fmt = () => {
      const now = new Date()
      let h = now.getHours(); const m = now.getMinutes().toString().padStart(2, '0')
      const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12
      setTime(`${h}:${m} ${ampm}`)
    }
    fmt(); const id = setInterval(fmt, 60000)
    return () => clearInterval(id)
  }, [])
  return time
}

/* ── Delivery steps ─────────────────────────────────── */
const steps = [
  { icon: MapPin,       num: '01', title: 'Book a Pickup',         desc: 'Enter your pickup address and parcel details in seconds. Choose express or scheduled.' },
  { icon: Truck,        num: '02', title: 'Driver Collects',        desc: 'A verified partner driver arrives at your door. Parcel is weighed, labelled & sealed.' },
  { icon: Zap,          num: '03', title: 'In Transit',             desc: 'Live GPS tracking every step of the way. Notifications on every milestone.' },
  { icon: CheckCircle2, num: '04', title: 'Delivered & Confirmed',  desc: 'Recipient gets a digital proof of delivery. Rate the experience in-app.' },
]

/* ── Nearby card features ───────────────────────────── */
const nearbyFeatures = [
  'Same-day express delivery',
  'Doorstep pickup & drop',
  'Real-time GPS tracking',
  'Fragile item handling',
  'Starting from ₹80',
  'COD & prepaid both',
]

/* ── Long-distance card features ───────────────────── */
const longFeatures = [
  'Multi-day scheduled delivery',
  'Nationwide — 40+ cities',
  'International shipping',
  'Insurance up to ₹50,000',
  'Starting from ₹299',
  'Bulk & business rates',
]

/* ── Trust logos ────────────────────────────────────── */
const trustNames = ['FedEx Partner', 'Delhivery API', 'Shiprocket', 'DTDC Network']

/* ─────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────── */
export default function DeliverParcel() {
  const navigate   = useNavigate()
  const { isAuthenticated } = useAuth()
  const heroRef    = useRef<HTMLDivElement>(null)
  const heroContent = useRef<HTMLDivElement>(null)
  const cardUpRefs  = useRef<HTMLDivElement[]>([])
  const cardDownRefs = useRef<HTMLDivElement[]>([])
  const time = useLiveClock()
  useReveal()

  /* Auth guard */
  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { state: { from: '/deliver' } })
  }, [isAuthenticated, navigate])
  if (!isAuthenticated) return null

  /* Parallax scroll */
  useEffect(() => {
    const onScroll = () => {
      const s = window.scrollY
      heroContent.current && (
        (heroContent.current.style.transform = `translateY(${s * 0.4}px)`),
        (heroContent.current.style.opacity = String(Math.max(0, 1 - s / 600)))
      )
      cardUpRefs.current.forEach(el => el && el.style.setProperty('--offset-up', `${s * -0.05}px`))
      cardDownRefs.current.forEach(el => el && el.style.setProperty('--offset-down', `${s * 0.05}px`))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="dp-root">
      {/* Noise texture overlay */}
      <div className="dp-noise" aria-hidden="true" />

      {/* ══════════════════════════════════════════
          HERO — full-screen, cream bg, floating parcels
      ══════════════════════════════════════════ */}
      <section className="dp-hero" ref={heroRef}>
        {/* Atmosphere bg */}
        <div className="dp-hero-atmo" aria-hidden="true">
          <div className="dp-atmo-gradient" />
          <div className="dp-atmo-dots"   />
        </div>

        {/* Floating decorative parcel – LEFT */}
        <div className="dp-float dp-float-left" aria-hidden="true">
          <div className="dp-parcel dp-parcel-green">
            <Package size={80} strokeWidth={1} />
            <div className="dp-parcel-tape dp-tape-h" />
            <div className="dp-parcel-tape dp-tape-v" />
          </div>
        </div>

        {/* Floating decorative globe – RIGHT */}
        <div className="dp-float dp-float-right" aria-hidden="true">
          <div className="dp-parcel dp-parcel-dark">
            <Globe size={80} strokeWidth={1} />
            <div className="dp-parcel-ring" />
          </div>
        </div>

        {/* Hero content */}
        <div className="dp-hero-inner" ref={heroContent}>
          <div className="dp-reveal">
            <h1 className="dp-hero-heading">
              Ship Anything,<br />
              <span className="dp-hero-italic">Anywhere.</span>
            </h1>
          </div>

          <div className="dp-reveal" style={{ transitionDelay: '200ms' }}>
            <p className="dp-hero-sub">
              From your neighbourhood to the next continent — RideXpress Delivery
              handles every parcel with speed, care, and live transparency.
            </p>
          </div>

          <div className="dp-reveal dp-hero-meta-row" style={{ transitionDelay: '400ms' }}>
            <div className="dp-pill-btn" role="button" onClick={() => document.getElementById('dp-cards')?.scrollIntoView({ behavior: 'smooth' })}>
              <span>Choose Your Service</span>
              <ArrowRight size={14} />
            </div>

            <div className="dp-hero-clock">
              <Clock size={12} />
              <span>{time}</span>
              <span className="dp-clock-div" />
              <span>India · 40+ Cities</span>
            </div>
          </div>
        </div>

        {/* Bottom fade */}
        <div className="dp-hero-fade" aria-hidden="true" />
      </section>

      {/* ══════════════════════════════════════════
          MISSION — centred editorial text
      ══════════════════════════════════════════ */}
      <section className="dp-mission">
        <div className="dp-container">
          <div className="dp-reveal dp-mission-text">
            <h2 className="dp-mission-heading">
              We carry your trust<br />as carefully as we carry<br />
              <em>your parcels.</em>
            </h2>
            <p className="dp-mission-sub">
              End-to-end logistics built on transparency, reliability, and a network of
              10,000+ verified delivery partners across India and beyond.
            </p>
          </div>

          {/* Trust logos */}
          <div className="dp-trust-row">
            {trustNames.map((n, i) => (
              <div
                key={n}
                className="dp-reveal dp-trust-item"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CARDS — two parallax cards
      ══════════════════════════════════════════ */}
      <section className="dp-cards-section" id="dp-cards">
        <div className="dp-container">
          <div className="dp-reveal dp-cards-header">
            <h2 className="dp-cards-heading">
              Choose your<br />
              <span className="dp-cards-italic">delivery range</span>
            </h2>
          </div>

          <div className="dp-cards-grid">

            {/* ── Card 1: Within 100KM (GREEN) ── */}
            <div
              className="dp-parallax-down"
              ref={el => { if (el) cardDownRefs.current[0] = el }}
            >
              <div className="dp-reveal dp-card dp-card-green">
                {/* Top row */}
                <div className="dp-card-top">
                  <div className="dp-card-icon-wrap dp-icon-dark">
                    <Package size={22} strokeWidth={1.8} />
                  </div>
                  <span className="dp-card-badge dp-badge-dark">01</span>
                </div>

                {/* Body */}
                <div className="dp-card-body">
                  <h3 className="dp-card-title">
                    Within<br />100 KM Radius
                  </h3>
                  <p className="dp-card-desc">
                    Perfect for same-city, same-district, or nearby town deliveries.
                    Lightning-fast and budget-friendly — your parcel arrives today.
                  </p>
                </div>

                {/* Features */}
                <ul className="dp-card-features">
                  {nearbyFeatures.map(f => (
                    <li key={f} className="dp-feature-item dp-feature-dark">
                      <CheckCircle2 size={13} strokeWidth={2} />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="dp-card-divider dp-div-dark" />

                <button
                  className="dp-card-cta dp-cta-dark"
                  onClick={() => navigate('/parcel-form', { state: { deliveryType: 'local' } })}
                >
                  Book Local Delivery
                  <ArrowUpRight size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* ── Card 2: 100KM+ / State / Abroad (CHARCOAL) — offset up ── */}
            <div
              className="dp-parallax-up dp-card-2-offset"
              ref={el => { if (el) cardUpRefs.current[0] = el }}
            >
              <div className="dp-reveal dp-card dp-card-dark" style={{ transitionDelay: '150ms' }}>
                {/* Top row */}
                <div className="dp-card-top">
                  <div className="dp-card-icon-wrap dp-icon-green">
                    <Globe size={22} strokeWidth={1.8} />
                  </div>
                  <span className="dp-card-badge dp-badge-muted">02</span>
                </div>

                {/* Body */}
                <div className="dp-card-body">
                  <h3 className="dp-card-title dp-title-cream">
                    100 KM+,<br />State &amp; Abroad
                  </h3>
                  <p className="dp-card-desc dp-desc-muted">
                    Interstate logistics, nationwide courier, and international freight —
                    all managed through one platform. Permanence in every delivery.
                  </p>
                </div>

                {/* Features */}
                <ul className="dp-card-features">
                  {longFeatures.map(f => (
                    <li key={f} className="dp-feature-item dp-feature-cream">
                      <CheckCircle2 size={13} strokeWidth={2} />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="dp-card-divider dp-div-muted" />

                <button
                  className="dp-card-cta dp-cta-green"
                  onClick={() => navigate('/parcel-form', { state: { deliveryType: 'longDistance' } })}
                >
                  Book Long-Distance
                  <ArrowUpRight size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Dot-grid background */}
        <div className="dp-dot-grid" aria-hidden="true" />
      </section>

      {/* ══════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════ */}
      <section className="dp-how">
        <div className="dp-container">
          <div className="dp-reveal dp-how-header">
            <span className="dp-label">Simple Process</span>
            <h2 className="dp-how-heading">How delivery<br />works</h2>
          </div>

          <div className="dp-steps-grid">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                className="dp-step"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.1 }}
              >
                <div className="dp-step-num">{s.num}</div>
                <div className="dp-step-icon">
                  <s.icon size={28} strokeWidth={1.5} />
                </div>
                <div className="dp-step-title">{s.title}</div>
                <p className="dp-step-desc">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          STATS ROW
      ══════════════════════════════════════════ */}
      <div className="dp-stats-row">
        {[
          { num: '850K+', lbl: 'Parcels Delivered' },
          { num: '99%',   lbl: 'On-Time Rate' },
          { num: '40+',   lbl: 'Cities Covered' },
          { num: '24/7',  lbl: 'Support Available' },
        ].map((s, i) => (
          <motion.div
            key={s.lbl} className="dp-stat"
            initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1 }}
          >
            <div className="dp-stat-num">{s.num}</div>
            <div className="dp-stat-lbl">{s.lbl}</div>
          </motion.div>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TESTIMONIAL STRIP
      ══════════════════════════════════════════ */}
      <section className="dp-testimonial">
        <div className="dp-container dp-test-inner">
          <div className="dp-stars" aria-label="5 stars">
            {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" strokeWidth={0} />)}
          </div>
          <blockquote className="dp-test-quote dp-reveal">
            "We ship hundreds of parcels daily using RideXpress Business. The reliability is unmatched — our delivery success rate jumped to 99% within the first month."
          </blockquote>
          <div className="dp-test-author">
            <div className="dp-test-avatar"><ShieldCheck size={18} /></div>
            <div>
              <div className="dp-test-name">Priya Sharma</div>
              <div className="dp-test-role">Founder, QuickMart Online Store</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CTA SECTION
      ══════════════════════════════════════════ */}
      <section className="dp-cta">
        <div className="dp-container dp-cta-inner">
          <motion.h2
            className="dp-cta-heading dp-reveal"
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            Ready to<br />send your first<br />parcel?
          </motion.h2>
          <motion.button
            className="dp-cta-btn"
            onClick={() => navigate('/parcel-form', { state: { deliveryType: 'local' } })}
            initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.97 }}
          >
            Schedule a Pickup
          </motion.button>
          <p className="dp-cta-note dp-reveal" style={{ transitionDelay: '300ms' }}>
            No subscription required · Pay per delivery · Cancel anytime
          </p>
        </div>
      </section>
    </div>
  )
}
