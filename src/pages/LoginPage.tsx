/**
 * LoginPage — Split-screen SaaS login adapted for RideXpress.
 * LEFT: Sage-green brand panel (dot-grid, tagline, testimonial, trust strip)
 * RIGHT: Clean form with PillNav toggle & 2-Step OTP Authentication
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { useAuth } from '../contexts/AuthContext'
import * as authService from '../services/authService'
import {
  Mail, Lock, Eye, EyeOff,
  BadgeCheck, ArrowRight, Star, AlertCircle,
  ShieldCheck, ArrowLeft, RefreshCw, KeyRound, CheckCircle2
} from 'lucide-react'
import './LoginPage.css'

/* ── Types ─────────────────────────────────────────── */
type LoginMode = 'customer' | 'employee'
type LoginStep = 'credentials' | 'otp'

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

/* ── 6-Digit OTP Box Grid ────────────────────────────── */
function OtpInputGrid({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (i: number, val: string) => {
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[i] = d
    onChange(next)
    if (d && i < 5) {
      refs.current[i + 1]?.focus()
    }
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      refs.current[i - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
    const next = [...value]
    digits.forEach((d, i) => { if (i < 6) next[i] = d })
    onChange(next)
    refs.current[Math.min(digits.length, 5)]?.focus()
  }

  return (
    <div className="lp-otp-grid" role="group" aria-label="6-digit OTP code">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          className={`lp-otp-box${digit ? ' lp-otp-filled' : ''}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1}`}
          autoFocus={i === 0}
        />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT: LoginPage
   ═══════════════════════════════════════════════════════ */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginWithCredentials } = useAuth()

  // State
  const [mode, setMode]               = useState<LoginMode>('customer')
  const [step, setStep]               = useState<LoginStep>('credentials')
  const [showPass, setShowPass]        = useState(false)
  const [remember, setRemember]        = useState(false)
  const [form, setForm]               = useState({ email: '', employeeId: '', password: '' })
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string>('')

  // OTP State
  const [otp, setOtp]                 = useState(['', '', '', '', '', ''])
  const [generatedOtp, setGeneratedOtp]= useState('482910')
  const [resendTimer, setResendTimer] = useState(30)
  const [verifying, setVerifying]     = useState(false)
  const [verifiedSuccess, setVerifiedSuccess] = useState(false)

  useEffect(() => { window.scrollTo(0, 0) }, [])

  // Resend Countdown Timer
  useEffect(() => {
    if (step !== 'otp' || resendTimer <= 0) return
    const id = window.setInterval(() => setResendTimer(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [step, resendTimer])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  /* ── Step 1: Validate Credentials & Send Email OTP ── */
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const emailToUse = mode === 'customer' ? form.email.trim() : (form.employeeId.trim() || form.email.trim())

    if (!emailToUse) {
      setError(mode === 'customer' ? 'Please enter your email address.' : 'Please enter your Employee ID or email.')
      return
    }
    if (!form.password) {
      setError('Please enter your password.')
      return
    }

    setSubmitting(true)
    try {
      // Validate credentials & request real OTP from MongoDB backend
      const result = await authService.loginRequest({
        email: emailToUse,
        password: form.password,
        accountType: mode === 'customer' ? 'user' : 'employee',
      })

      // Store server dev OTP if returned (for instant dev testing)
      if (result.devOtp) {
        setGeneratedOtp(result.devOtp)
      }

      setOtp(['', '', '', '', '', ''])
      setResendTimer(30)

      // Advance to OTP step on the SAME page
      setStep('otp')
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Step 2: Verify OTP with Server & Complete Login ── */
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const entered = otp.join('')

    if (entered.length < 6) {
      setError('Please enter the full 6-digit verification code.')
      return
    }

    const emailToUse = mode === 'customer' ? form.email.trim() : (form.employeeId.trim() || form.email.trim())

    setVerifying(true)
    try {
      // Verify OTP with backend API
      const result = await authService.verifyOtp({
        email: emailToUse,
        otp: entered,
        accountType: mode === 'customer' ? 'user' : 'employee',
      })

      setVerifiedSuccess(true)
      setTimeout(() => {
        loginWithCredentials(result.token, result.user)
        if (mode === 'customer') {
          const destination = (location.state as any)?.from || '/book'
          navigate(destination)
        } else {
          navigate('/employee-dashboard')
        }
      }, 500)
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.')
    } finally {
      setVerifying(false)
    }
  }

  /* ── Resend Code via Server ──────────────────────── */
  const handleResendOtp = async () => {
    setError('')
    const emailToUse = mode === 'customer' ? form.email.trim() : (form.employeeId.trim() || form.email.trim())
    try {
      const result = await authService.resendOtp({
        email: emailToUse,
        accountType: mode === 'customer' ? 'user' : 'employee',
      })
      if (result.devOtp) {
        setGeneratedOtp(result.devOtp)
      }
      setOtp(['', '', '', '', '', ''])
      setResendTimer(30)
    } catch (err: any) {
      setError(err.message || 'Could not resend OTP. Please try again.')
    }
  }

  /* ── Switch Mode (Reset everything) ──────────────── */
  const handleModeChange = (m: LoginMode) => {
    setMode(m)
    setStep('credentials')
    setShowPass(false)
    setError('')
    setForm({ email: '', employeeId: '', password: '' })
    setOtp(['', '', '', '', '', ''])
  }

  /* ── Back to Credentials ─────────────────────────── */
  const handleBackToCredentials = () => {
    setStep('credentials')
    setError('')
    setOtp(['', '', '', '', '', ''])
  }

  const emailDisplay = mode === 'customer' ? form.email : (form.employeeId || form.email)

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
            {step === 'credentials' ? (
              <>
                <h1 className="lp-welcome">Welcome back</h1>
                <p className="lp-form-sub">
                  {mode === 'customer'
                    ? 'Sign in to book rides, track deliveries, and manage trips.'
                    : 'Access the RideXpress employee & rider portal.'}
                </p>
              </>
            ) : (
              <>
                <div className="lp-otp-badge-icon">
                  <ShieldCheck size={28} />
                </div>
                <h1 className="lp-welcome">Verification Code</h1>
                <p className="lp-form-sub">
                  Enter the 6-digit code sent to <strong>{emailDisplay}</strong>
                </p>
              </>
            )}
          </div>

          {/* PillNav Mode Toggle (Only visible on Step 1) */}
          {step === 'credentials' && (
            <ModeToggle mode={mode} onChange={handleModeChange} />
          )}

          {/* STEP 1: CREDENTIALS FORM */}
          {step === 'credentials' && (
            <form className="lp-form" onSubmit={handleCredentialsSubmit} noValidate>
              <AnimatePresence mode="wait">
                {mode === 'customer' ? (
                  <motion.div
                    key="customer"
                    className="lp-fields"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <InputField
                      id="email"
                      name="email"
                      label="Email Address"
                      type="email"
                      placeholder="name@example.com"
                      icon={<Mail size={15} />}
                      value={form.email}
                      onChange={handleChange}
                      autoComplete="email"
                    />
                    <PasswordField
                      value={form.password}
                      onChange={handleChange}
                      show={showPass}
                      toggle={() => setShowPass(v => !v)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="employee"
                    className="lp-fields"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                  >
                    <InputField
                      id="empId"
                      name="employeeId"
                      label="Employee ID or Email"
                      placeholder="EMP-000001 or driver@ridexpress.com"
                      icon={<BadgeCheck size={15} />}
                      value={form.employeeId}
                      onChange={handleChange}
                      autoComplete="username"
                    />
                    <PasswordField
                      value={form.password}
                      onChange={handleChange}
                      show={showPass}
                      toggle={() => setShowPass(v => !v)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error alert */}
              {error && (
                <motion.div
                  className="lp-error-alert"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}

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
                    <span>Continue to Verification</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: OTP AUTHENTICATION FORM */}
          {step === 'otp' && (
            <motion.form
              className="lp-form lp-otp-form"
              onSubmit={handleOtpVerify}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              noValidate
            >
              {/* Quick Auto-Fill Demo OTP Pill */}
              <div
                className="lp-demo-otp-pill"
                onClick={() => setOtp(generatedOtp.split(''))}
                title="Click to auto-fill code for instant test"
              >
                <KeyRound size={13} />
                <span>Demo Code: <strong>{generatedOtp}</strong> (Click to auto-fill)</span>
              </div>

              {/* 6 Digit Box Grid */}
              <OtpInputGrid value={otp} onChange={setOtp} />

              {/* Error Alert */}
              {error && (
                <motion.div
                  className="lp-error-alert"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}

              {/* Resend OTP Row */}
              <div className="lp-otp-resend-row">
                {resendTimer > 0 ? (
                  <span className="lp-otp-timer">Resend code in <strong>{resendTimer}s</strong></span>
                ) : (
                  <button
                    type="button"
                    className="lp-otp-resend-btn"
                    onClick={handleResendOtp}
                  >
                    <RefreshCw size={13} /> Resend OTP
                  </button>
                )}
              </div>

              {/* Verify & Sign In Button */}
              <button
                type="submit"
                className={`lp-submit${verifying ? ' submitting' : ''}`}
                disabled={verifying || otp.join('').length < 6}
              >
                {verifying ? (
                  <span className="lp-spinner" />
                ) : verifiedSuccess ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Verified! Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Verify &amp; Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Back to Credentials Link */}
              <button
                type="button"
                className="lp-otp-back-link"
                onClick={handleBackToCredentials}
              >
                <ArrowLeft size={14} />
                <span>Change email or password</span>
              </button>
            </motion.form>
          )}

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
