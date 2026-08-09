/**
 * LoginPage — Split-screen SaaS login adapted for RideXpress.
 * LEFT: Sage-green brand panel (dot-grid, tagline, testimonial, trust strip)
 * RIGHT: White form with PillNav-style GSAP toggle (Customer ↔ Employee)
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { useAuth } from '../contexts/AuthContext'
import {
  User, Mail, Phone, MapPin, Lock, Eye, EyeOff,
  BadgeCheck, ArrowRight, Star
} from 'lucide-react'
import './LoginPage.css'

/* ── Types ─────────────────────────────────────────── */
type LoginMode = 'customer' | 'employee'

/* ── GSAP PillNav Toggle ────────────────────────────── */
function ModeToggle({
  mode,
  onChange,
}: {
  mode: LoginMode
  onChange: (m: LoginMode) => void
}) {
  const circleRefs  = useRef<(HTMLSpanElement | null)[]>([])
  const tlRefs      = useRef<(gsap.core.Timeline | null)[]>([])
  const tweenRefs   = useRef<(gsap.core.Tween | null)[]>([])
  const pillRefs    = useRef<(HTMLButtonElement | null)[]>([])

  const TABS = [
    { id: 'customer' as const, label: 'Customer' },
    { id: 'employee' as const, label: 'Employee' },
  ]

  const layout = useCallback(() => {
    TABS.forEach((_, i) => {
      const pill   = pillRefs.current[i]
      const circle = circleRefs.current[i]
      if (!pill || !circle) return

      const { width: w, height: h } = pill.getBoundingClientRect()
      if (!w || !h) return

      const R      = ((w * w) / 4 + h * h) / (2 * h)
      const D      = Math.ceil(2 * R) + 2
      const delta  = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1
      const originY = D - delta

      circle.style.width  = `${D}px`
      circle.style.height = `${D}px`
      circle.style.bottom = `-${delta}px`

      gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${originY}px` })

      const lbl  = pill.querySelector<HTMLElement>('.tgl-lbl')
      const hvr  = pill.querySelector<HTMLElement>('.tgl-hvr')
      if (lbl) gsap.set(lbl, { y: 0 })
      if (hvr) gsap.set(hvr, { y: h + 12, opacity: 0 })

      tlRefs.current[i]?.kill()
      const tl = gsap.timeline({ paused: true })
      tl.to(circle, { scale: 1.2, xPercent: -50, duration: 0.8, ease: 'power3.out', overwrite: 'auto' }, 0)
      if (lbl) tl.to(lbl, { y: -(h + 8), duration: 0.6, ease: 'power3.out', overwrite: 'auto' }, 0)
      if (hvr) {
        gsap.set(hvr, { y: Math.ceil(h + 20), opacity: 0 })
        tl.to(hvr, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', overwrite: 'auto' }, 0)
      }
      tlRefs.current[i] = tl
    })
  }, [])

  useEffect(() => {
    layout()
    window.addEventListener('resize', layout)
    if (document.fonts) document.fonts.ready.then(layout).catch(() => {})
    return () => window.removeEventListener('resize', layout)
  }, [layout])

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i]
    if (!tl) return
    tweenRefs.current[i]?.kill()
    tweenRefs.current[i] = tl.tweenTo(tl.duration(), { duration: 0.4, ease: 'power3.out', overwrite: 'auto' })
  }
  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i]
    if (!tl) return
    tweenRefs.current[i]?.kill()
    tweenRefs.current[i] = tl.tweenTo(0, { duration: 0.3, ease: 'power3.out', overwrite: 'auto' })
  }

  return (
    <div className="tgl-container" role="tablist">
      {TABS.map((tab, i) => {
        const isActive = mode === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            ref={el => { pillRefs.current[i] = el }}
            className={`tgl-pill${isActive ? ' tgl-active' : ''}`}
            onMouseEnter={() => !isActive && handleEnter(i)}
            onMouseLeave={() => !isActive && handleLeave(i)}
            onClick={() => onChange(tab.id)}
          >
            <span
              className="tgl-circle"
              aria-hidden="true"
              ref={el => { circleRefs.current[i] = el }}
            />
            <span className="tgl-stack">
              <span className="tgl-lbl">{tab.label}</span>
              <span className="tgl-hvr" aria-hidden="true">{tab.label}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ── Input field ─────────────────────────────────────── */
interface FieldProps {
  id: string
  label: string
  name: string
  type?: string
  placeholder: string
  value: string
  icon: React.ReactNode
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  autoComplete?: string
}
function InputField({ id, label, name, type = 'text', placeholder, value, icon, onChange, autoComplete }: FieldProps) {
  return (
    <div className="lp-field">
      <label className="lp-label" htmlFor={id}>{label}</label>
      <div className="lp-field-wrap">
        <span className="lp-icon" aria-hidden="true">{icon}</span>
        <input
          id={id}
          className="lp-input"
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
        />
      </div>
    </div>
  )
}

/* ── Password field ─────────────────────────────────── */
function PasswordField({ value, onChange, show, toggle }: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  show: boolean
  toggle: () => void
}) {
  return (
    <div className="lp-field">
      <label className="lp-label" htmlFor="password">Password</label>
      <div className="lp-field-wrap">
        <span className="lp-icon" aria-hidden="true"><Lock size={15} /></span>
        <input
          id="password"
          className="lp-input"
          name="password"
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
          value={value}
          onChange={onChange}
          autoComplete="current-password"
        />
        <button type="button" className="lp-show-toggle" onClick={toggle} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────── */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [mode, setMode]       = useState<LoginMode>('customer')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', location: '',
    employeeId: '', password: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 900)) // Simulate auth
    setSubmitting(false)
    if (mode === 'customer') {
      login()
      const destination = location.state?.from || '/book'
      navigate(destination)
    } else {
      login()
      navigate('/employee-dashboard')
    }
  }

  const handleModeChange = (m: LoginMode) => {
    setMode(m)
    setShowPass(false)
    setForm({ name: '', email: '', phone: '', location: '', employeeId: '', password: '' })
  }

  return (
    <div className="lp-root">

      {/* ── LEFT: Brand Panel ─────────────────────────── */}
      <div className="lp-left" aria-label="RideXpress brand panel">
        <div className="lp-left-inner">

          {/* Wordmark */}
          <div className="lp-wordmark">
            Ride<span className="lp-rx">X</span>press
          </div>

          {/* Middle: value prop + testimonial */}
          <div className="lp-value-block">
            <h2 className="lp-headline">
              Move Smarter.<br />
              <span className="lp-hl-accent">Deliver</span> Faster.
            </h2>
            <p className="lp-subline">
              One seamless platform for booking rides and scheduling parcel deliveries.
              Fast, secure, and always on time — for commuters, businesses &amp; individuals.
            </p>

            {/* Testimonial */}
            <div className="lp-testimonial">
              <div className="lp-stars" aria-label="5 stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="lp-quote">
                "RideXpress cut our delivery costs by 40% in the first month. It just works — every single time."
              </p>
              <div className="lp-bio">
                <div className="lp-avatar" aria-hidden="true">R</div>
                <div>
                  <div className="lp-bio-name">Rajan Mehta</div>
                  <div className="lp-bio-role">Operations Lead, LogiCo India</div>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* ── RIGHT: Auth Form ──────────────────────────── */}
      <div className="lp-right">
        {/* Top-right nav */}
        <div className="lp-right-top">
          <span className="lp-rt-muted">New here?</span>
          <Link to="/register" state={{ role: mode }} className="lp-rt-link">Get started free</Link>
        </div>

        <div className="lp-form-wrap">
          {/* Header */}
          <div className="lp-form-header">
            <h1 className="lp-welcome">Welcome back</h1>
            <p className="lp-form-sub">
              {mode === 'customer'
                ? 'Sign in to book your next ride or schedule a delivery.'
                : 'Access the RideXpress employee dashboard.'}
            </p>
          </div>

          {/* PillNav Mode Toggle */}
          <ModeToggle mode={mode} onChange={handleModeChange} />

          {/* Form */}
          <form className="lp-form" onSubmit={handleSubmit} noValidate>
            <AnimatePresence mode="wait">
              {mode === 'customer' ? (
                <motion.div
                  key="customer"
                  className="lp-fields"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <InputField
                    id="name" name="name" label="Full Name"
                    placeholder="Your full name"
                    icon={<User size={15} />}
                    value={form.name} onChange={handleChange}
                    autoComplete="name"
                  />
                  <InputField
                    id="email" name="email" label="Email Address" type="email"
                    placeholder="you@example.com"
                    icon={<Mail size={15} />}
                    value={form.email} onChange={handleChange}
                    autoComplete="email"
                  />
                  <div className="lp-two-col">
                    <InputField
                      id="phone" name="phone" label="Phone Number" type="tel"
                      placeholder="+91 98765 43210"
                      icon={<Phone size={15} />}
                      value={form.phone} onChange={handleChange}
                      autoComplete="tel"
                    />
                    <InputField
                      id="location" name="location" label="Your City"
                      placeholder="Mumbai, Delhi…"
                      icon={<MapPin size={15} />}
                      value={form.location} onChange={handleChange}
                    />
                  </div>
                  <PasswordField
                    value={form.password} onChange={handleChange}
                    show={showPass} toggle={() => setShowPass(v => !v)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="employee"
                  className="lp-fields"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <InputField
                    id="empId" name="employeeId" label="Employee ID"
                    placeholder="EMP-000123"
                    icon={<BadgeCheck size={15} />}
                    value={form.employeeId} onChange={handleChange}
                    autoComplete="username"
                  />
                  <PasswordField
                    value={form.password} onChange={handleChange}
                    show={showPass} toggle={() => setShowPass(v => !v)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Options row */}
            <div className="lp-options">
              <label className="lp-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a href="#" className="lp-forgot">Forgot password?</a>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              className={`lp-submit${submitting ? ' submitting' : ''}`}
              disabled={submitting}
            >
              {submitting ? (
                <span className="lp-spinner" />
              ) : (
                <>
                  {mode === 'customer' ? 'Sign in as Customer' : 'Sign in as Employee'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="lp-form-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/register" state={{ role: mode }} className="lp-rt-link">Get started free</Link>
            </p>
            <p className="lp-legal">
              By signing in you agree to our{' '}
              <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
