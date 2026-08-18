/**
 * RegisterPage — 3-step customer registration wizard.
 * Step 1: Account info (name, age, city, email, password)
 * Step 2: Profile setup (display name, gender, insurance)
 * Step 3: OTP verification
 */
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Mail, MapPin, Hash, BadgeCheck, Phone, ShieldCheck, Lock, AlertCircle } from 'lucide-react'
import { AnimatedStepper, Step } from '../components/AnimatedStepper'
import { useAuth } from '../contexts/AuthContext'
import * as authService from '../services/authService'
import './RegisterPage.css'

/* ── OTP box group ──────────────────────────────────── */
function OtpInput({ value, onChange }: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (i: number, raw: string) => {
    if (!/^\d*$/.test(raw)) return
    const next = [...value]
    next[i] = raw.slice(-1)
    onChange(next)
    if (raw && i < 5) refs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft'  && i > 0) refs.current[i - 1]?.focus()
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
    <div className="otp-grid" role="group" aria-label="OTP input">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          className={`otp-box${digit ? ' otp-filled' : ''}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}

/* ── Field helpers ──────────────────────────────────── */
function Field({ id, label, icon, required = false, children }: {
  id: string; label: string; icon: React.ReactNode; required?: boolean; children: React.ReactNode
}) {
  return (
    <div className="rg-field">
      <label className="rg-label" htmlFor={id}>
        {label}{required && <span className="rg-req" aria-hidden="true"> *</span>}
      </label>
      <div className="rg-input-wrap">
        <span className="rg-icon" aria-hidden="true">{icon}</span>
        {children}
      </div>
    </div>
  )
}

function TextInput({ id, name, type = 'text', placeholder, value, onChange, autoComplete }: {
  id: string; name: string; type?: string; placeholder: string
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  autoComplete?: string
}) {
  return (
    <input
      id={id} name={name} type={type} placeholder={placeholder}
      value={value} onChange={onChange} autoComplete={autoComplete}
      className="rg-input"
    />
  )
}

/* ── Main page ─────────────────────────────────────── */
export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginWithCredentials } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [role, setRole] = useState<'customer' | 'employee'>(() => {
    return (location.state as any)?.role || 'customer'
  })

  // Step 1 — added password field
  const [s1, setS1] = useState({ name: '', age: '', city: '', email: '', password: '' })
  // Step 2
  const [s2, setS2] = useState({ displayName: '', gender: '', hasInsurance: false, insuranceId: '' })
  // Step 3 OTP
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [otpSent, setOtpSent] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [otpVerified, setOtpVerified] = useState(false)

  // API state
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError]     = useState('')

  useEffect(() => { window.scrollTo(0, 0) }, [])

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return
    const id = window.setInterval(() => setResendTimer(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [resendTimer])

  const sendOtp = () => {
    setOtpSent(true)
    setResendTimer(30)
    setOtp(['', '', '', '', '', ''])
  }

  const verifyOtp = () => {
    const code = otp.join('')
    if (code.length === 6) {
      setOtpVerified(true)
    }
  }

  const handleComplete = async () => {
    setRegError('')
    setRegLoading(true)
    try {
      if (role === 'employee') {
        // Save name + password to localStorage so EmployeeForm can use them
        localStorage.setItem('emp_name',     s1.name     || 'Employee')
        localStorage.setItem('emp_email',    s1.email    || '')
        localStorage.setItem('emp_password', s1.password || '')
        navigate('/employee-form')
      } else {
        const result = await authService.registerUser({
          name:     s1.name,
          email:    s1.email,
          password: s1.password,
          phone:    '',
          city:     s1.city,
        })
        loginWithCredentials(result.token, result.user)
        const destination = (location.state as any)?.from || '/book'
        navigate(destination)
      }
    } catch (err: any) {
      setRegError(err.message || 'Registration failed. Please try again.')
    } finally {
      setRegLoading(false)
    }
  }

  const ch1 = (e: React.ChangeEvent<HTMLInputElement>) => setS1(p => ({ ...p, [e.target.name]: e.target.value }))
  const ch2 = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setS2(p => ({ ...p, [e.target.name]: (e.target as HTMLInputElement).type === 'checkbox'
      ? (e.target as HTMLInputElement).checked : e.target.value }))

  return (
    <div className="rg-page">

      {/* ── Top brand bar ─────────────────────────────── */}
      <div className="rg-topbar">
        <Link to="/" className="rg-logo">
          Ride<span className="rg-rx">X</span>press
        </Link>
        <div className="rg-topbar-right">
          <span className="rg-topbar-muted">Already have an account?</span>
          <Link to="/login" className="rg-topbar-link">Sign in</Link>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────── */}
      <div className="rg-body">

        {/* Page header */}
        <div className="rg-page-header">
          <motion.div
            className="rg-step-badge"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Step {currentStep} of 3
          </motion.div>
          <motion.h1
            className="rg-page-title"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            {currentStep === 1 && (role === 'employee' ? 'Create your employee account' : 'Create your account')}
            {currentStep === 2 && (role === 'employee' ? 'Set up employee profile' : 'Set up your profile')}
            {currentStep === 3 && 'Verify your phone'}
          </motion.h1>
          <motion.p
            className="rg-page-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {currentStep === 1 && 'Start with the basics — your account details.'}
            {currentStep === 2 && (role === 'employee' ? 'How should we display you as an active rider?' : 'How should we address you in the app?')}
            {currentStep === 3 && 'We\'ll send a one-time code to confirm your identity.'}
          </motion.p>
        </div>

        {/* Stepper */}
        <div className="rg-stepper-wrap">
          <AnimatedStepper
            disableStepIndicators
            onStepChange={setCurrentStep}
            onFinalStepCompleted={handleComplete}
            backButtonText="← Back"
            nextButtonText="Continue →"
          >

            {/* ── STEP 1: Account Info ─────────────────── */}
            <Step title="Account Information">
              <div className="rg-fields">
                {/* Error banner */}
                {regError && (
                  <motion.div
                    className="rg-error-alert"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <AlertCircle size={14} />
                    {regError}
                  </motion.div>
                )}

                {/* Role Toggle Selector */}
                <div className="rg-role-selector">
                  <button
                    type="button"
                    className={`rg-role-btn ${role === 'customer' ? 'active' : ''}`}
                    onClick={() => setRole('customer')}
                  >
                    Register as Customer
                  </button>
                  <button
                    type="button"
                    className={`rg-role-btn ${role === 'employee' ? 'active' : ''}`}
                    onClick={() => setRole('employee')}
                  >
                    Register as Employee
                  </button>
                </div>

                <Field id="name" label="Full Name" icon={<User size={15} />} required>
                  <TextInput id="name" name="name" placeholder="Your legal name"
                    value={s1.name} onChange={ch1} autoComplete="name" />
                </Field>
                <div className="rg-two-col">
                  <Field id="age" label="Age" icon={<Hash size={15} />} required>
                    <TextInput id="age" name="age" type="number" placeholder="e.g. 25"
                      value={s1.age} onChange={ch1} />
                  </Field>
                  <Field id="city" label="Your City" icon={<MapPin size={15} />} required>
                    <TextInput id="city" name="city" placeholder="Mumbai, Delhi…"
                      value={s1.city} onChange={ch1} />
                  </Field>
                </div>
                <Field id="email" label="Email Address" icon={<Mail size={15} />} required>
                  <TextInput id="email" name="email" type="email" placeholder="you@example.com"
                    value={s1.email} onChange={ch1} autoComplete="email" />
                </Field>
                <Field id="password" label="Password" icon={<Lock size={15} />} required>
                  <TextInput id="password" name="password" type="password" placeholder="Min 6 characters"
                    value={s1.password} onChange={ch1} autoComplete="new-password" />
                </Field>
              </div>
            </Step>

            {/* ── STEP 2: Profile ─────────────────────── */}
            <Step title="Your Profile">
              <div className="rg-fields">
                <p className="rg-hint">
                  This is how your name will appear in the app and to drivers.
                </p>
                <Field id="displayName" label="Display Name" icon={<User size={15} />} required>
                  <TextInput id="displayName" name="displayName" placeholder={s1.name || 'Nickname or first name'}
                    value={s2.displayName} onChange={ch2} />
                </Field>

                <div className="rg-field">
                  <label className="rg-label">Gender <span className="rg-req" aria-hidden="true"> *</span></label>
                  <div className="rg-gender-grid">
                    {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map(g => (
                      <label key={g} className={`rg-gender-opt${s2.gender === g ? ' selected' : ''}`}>
                        <input
                          type="radio" name="gender" value={g}
                          checked={s2.gender === g}
                          onChange={ch2}
                        />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Insurance toggle */}
                <div className="rg-insurance-row">
                  <label className="rg-toggle-label">
                    <input
                      type="checkbox" name="hasInsurance"
                      checked={s2.hasInsurance}
                      onChange={ch2}
                    />
                    <span className="rg-toggle-track">
                      <span className="rg-toggle-thumb" />
                    </span>
                    <span>I have a life insurance policy</span>
                  </label>
                </div>

                <AnimatePresence>
                  {s2.hasInsurance && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <Field id="insuranceId" label="Insurance Policy ID" icon={<BadgeCheck size={15} />}>
                        <TextInput id="insuranceId" name="insuranceId" placeholder="e.g. LIC-2024-XXXXXX"
                          value={s2.insuranceId} onChange={ch2} />
                      </Field>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Step>

            {/* ── STEP 3: OTP ─────────────────────────── */}
            <Step title="OTP Verification">
              <div className="rg-otp-section">

                <div className="rg-otp-icon-wrap">
                  <ShieldCheck size={36} strokeWidth={1.5} />
                </div>

                {!otpSent ? (
                  <>
                    <p className="rg-otp-text">
                      We'll send a 6-digit code to your registered phone number or email to verify your identity.
                    </p>
                    <div className="rg-otp-phone-row">
                      <span className="rg-otp-phone-icon"><Phone size={15} /></span>
                      <span className="rg-otp-phone-val">{s1.email || 'your registered contact'}</span>
                    </div>
                    <button className="rg-send-otp-btn" onClick={sendOtp}>
                      Send OTP
                    </button>
                  </>
                ) : otpVerified ? (
                  <motion.div
                    className="rg-otp-success"
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 20 }}
                  >
                    <div className="rg-success-ring">
                      <ShieldCheck size={28} />
                    </div>
                    <p className="rg-success-text">Phone verified!</p>
                    <p className="rg-success-sub">Your account is ready. Click Complete to continue.</p>
                  </motion.div>
                ) : (
                  <>
                    <p className="rg-otp-text">
                      Enter the 6-digit code sent to <strong>{s1.email || 'your contact'}</strong>
                    </p>
                    <OtpInput value={otp} onChange={setOtp} />

                    <button
                      className="rg-verify-btn"
                      onClick={verifyOtp}
                      disabled={otp.join('').length < 6}
                    >
                      Verify Code
                    </button>

                    <div className="rg-resend-row">
                      {resendTimer > 0 ? (
                        <span className="rg-resend-timer">Resend in {resendTimer}s</span>
                      ) : (
                        <button className="rg-resend-btn" onClick={sendOtp}>Resend OTP</button>
                      )}
                    </div>

                    <p className="rg-otp-note">
                      🔒 OTP verification is a placeholder — functional after backend integration.
                    </p>
                  </>
                )}
              </div>
            </Step>

          </AnimatedStepper>
        </div>

        {/* Benefits strip */}
        <div className="rg-benefits">
          {[
            { icon: '⚡', text: 'Book rides in under 30 seconds' },
            { icon: '📦', text: 'Same-day parcel delivery' },
            { icon: '🔐', text: 'Secure & verified drivers' },
          ].map(b => (
            <div key={b.text} className="rg-benefit-item">
              <span className="rg-benefit-icon">{b.icon}</span>
              <span>{b.text}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
