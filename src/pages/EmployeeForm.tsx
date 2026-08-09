/**
 * EmployeeForm.tsx
 * Employee Onboarding form — adapted from the ParcelForm style.
 *
 * Fields:
 *  1. Vehicle Category (searchable dropdown)
 *  2. Vehicle Registration details (RC Number)
 *  3. Vehicle RC Document Photo (upload or camera)
 *  4. Vehicle Insurance details (Policy Number + Photo)
 *  5. Driving License details (DL Number + Expiry + Photo)
 *  6. Rider Details (PAN/Aadhaar Number + Photo)
 *  7. Rider Profile Photo (face photo for app profile)
 *
 * Theme: Cream #F5F0E8 · Sage-Green #6B9E72 · Charcoal #1A1A1A
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Camera, Upload, Calendar, Shield,
  ChevronDown, CheckCircle2, ArrowRight, ArrowLeft,
  Info, AlertCircle, FileText, Landmark, Key, UserCheck
} from 'lucide-react'
import './EmployeeForm.css'

/* ── Vehicle categories ──────────────────────────────── */
const VEHICLE_CATEGORIES = [
  { id: 'scooty', label: 'Scooty', icon: '🛵', desc: 'Fast traffic-beating two-wheeler' },
  { id: 'moto', label: 'Moto', icon: '🏍️', desc: 'Standard/Premium motorcycle' },
  { id: 'auto', label: 'Auto Rickshaw', icon: '🛺', desc: 'Classic three-wheeler urban ride' },
  { id: 'hatchback', label: 'Hatchback', icon: '🚗', desc: 'Compact passenger car' },
  { id: 'sedan', label: 'Sedan', icon: '🚙', desc: 'Premium passenger vehicle' },
  { id: 'suv', label: 'XL SUV', icon: '🚐', desc: 'Large 6-seater utility vehicle' },
  { id: 'jeep', label: 'Jeep', icon: '🚜', desc: 'Rugged all-terrain vehicle' },
  { id: 'bus', label: 'Mini Bus', icon: '🚌', desc: 'Group commute vehicle' },
]

/* ── Animated section heading ───────────────────────── */
function SectionHead({ num, label }: { num: string; label: string }) {
  return (
    <div className="ef-section-head">
      <span className="ef-section-num">{num}</span>
      <span className="ef-section-label">{label}</span>
    </div>
  )
}

/* ── Searchable Category Dropdown ───────────────────── */
function CategoryDropdown({
  value, onChange,
}: {
  value: string; onChange: (id: string) => void
}) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = VEHICLE_CATEGORIES.find(c => c.id === value)

  const filtered = query
    ? VEHICLE_CATEGORIES.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.desc.toLowerCase().includes(query.toLowerCase())
      )
    : VEHICLE_CATEGORIES

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.ef-cat-wrap')) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="ef-cat-wrap">
      <button
        type="button"
        className={`ef-cat-trigger ${open ? 'ef-cat-open' : ''} ${value ? 'ef-cat-selected' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="ef-cat-trigger-left">
          {selected ? (
            <>
              <span className="ef-cat-icon">{selected.icon}</span>
              <span className="ef-cat-name">{selected.label}</span>
            </>
          ) : (
            <span className="ef-cat-placeholder">Select vehicle category…</span>
          )}
        </span>
        <ChevronDown size={16} className={`ef-chevron ${open ? 'ef-chevron-up' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="ef-cat-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Search */}
            <div className="ef-cat-search">
              <input
                ref={inputRef}
                className="ef-cat-search-input"
                placeholder="Search vehicles…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>

            <div className="ef-cat-list">
              {filtered.length === 0 ? (
                <div className="ef-cat-empty">No category found</div>
              ) : filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`ef-cat-item ${c.id === value ? 'ef-cat-item-active' : ''}`}
                  onClick={() => { onChange(c.id); setOpen(false); setQuery('') }}
                >
                  <span className="ef-cat-item-icon">{c.icon}</span>
                  <span className="ef-cat-item-info">
                    <span className="ef-cat-item-name">{c.label}</span>
                    <span className="ef-cat-item-desc">{c.desc}</span>
                  </span>
                  {c.id === value && <CheckCircle2 size={14} className="ef-cat-check" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Photo/Doc Upload ────────────────────────────────── */
function DocumentUpload({
  label, preview, onFile,
}: {
  label: string; preview: string | null; onFile: (f: File) => void
}) {
  const fileRef   = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onFile(f)
  }

  return (
    <div className="ef-doc-upload-box">
      <span className="ef-doc-lbl">{label}</span>
      {preview ? (
        <div className="ef-photo-preview">
          <img src={preview} alt={label} className="ef-photo-img" />
          <div className="ef-photo-actions">
            <button type="button" className="ef-photo-rebtn" onClick={() => fileRef.current?.click()}>
              <Upload size={12} /> Upload New
            </button>
            <button type="button" className="ef-photo-rebtn" onClick={() => cameraRef.current?.click()}>
              <Camera size={12} /> Camera
            </button>
          </div>
        </div>
      ) : (
        <div className="ef-photo-empty">
          <div className="ef-photo-btns">
            <button
              type="button"
              className="ef-photo-btn ef-photo-btn-outline"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={14} /> Upload File
            </button>
            <button
              type="button"
              className="ef-photo-btn ef-photo-btn-solid"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera size={14} /> Use Camera
            </button>
          </div>
        </div>
      )}

      {/* Hidden inputs */}
      <input ref={fileRef}   type="file" accept="image/*"                        onChange={handle} hidden />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"  onChange={handle} hidden />
    </div>
  )
}

/* ── Form Field Wrapper ──────────────────────────────── */
function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="ef-field">
      <label className="ef-label">
        {label}
        {required && <span className="ef-required">*</span>}
        {hint && (
          <span className="ef-hint-tooltip" title={hint}>
            <Info size={11} />
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

/* ── Main Onboarding Component ───────────────────────── */
export default function EmployeeForm() {
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => { window.scrollTo(0, 0) }, [])

  /* ── Form State ── */
  const [category,     setCategory]     = useState('')
  const [rcNumber,     setRcNumber]     = useState('')
  const [rcPhoto,      setRcPhoto]      = useState<string | null>(null)
  
  const [insNumber,    setInsNumber]    = useState('')
  const [insPhoto,     setInsPhoto]     = useState<string | null>(null)

  const [dlNumber,     setDlNumber]     = useState('')
  const [dlExpiry,     setDlExpiry]     = useState('')
  const [dlPhoto,      setDlPhoto]      = useState<string | null>(null)

  const [idType,       setIdType]       = useState('Aadhaar')
  const [idNumber,     setIdNumber]     = useState('')
  const [idPhoto,      setIdPhoto]      = useState<string | null>(null)

  const [riderPhoto,   setRiderPhoto]   = useState<string | null>(null)

  const [submitted,    setSubmitted]    = useState(false)
  const [errors,       setErrors]       = useState<Record<string, string>>({})

  /* Helper to read files for previews */
  const handlePhotoUpload = (setPreview: (url: string) => void) => (file: File) => {
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  /* Validation */
  const validate = () => {
    const e: Record<string, string> = {}
    if (!category)    e.category = 'Please select a vehicle category'
    if (!rcNumber)    e.rcNumber = 'Vehicle RC number is required'
    if (!rcPhoto)     e.rcPhoto  = 'RC document photo is required'
    if (!insNumber)   e.insNumber = 'Vehicle insurance policy number is required'
    if (!insPhoto)    e.insPhoto = 'Insurance document photo is required'
    if (!dlNumber)    e.dlNumber = 'Driving License number is required'
    if (!dlExpiry)    e.dlExpiry = 'Driving License expiry date is required'
    if (!dlPhoto)     e.dlPhoto = 'DL photo is required'
    if (!idNumber)    e.idNumber = 'Identity document number is required'
    if (!idPhoto)     e.idPhoto = 'Identity document photo is required'
    if (!riderPhoto)  e.riderPhoto = 'Rider profile photo is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      document.querySelector('.ef-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSubmitted(true)
  }

  const handleComplete = () => {
    const vehLabel = VEHICLE_CATEGORIES.find(c => c.id === category)?.label || 'Vehicle'
    localStorage.setItem('emp_vehicle', vehLabel)
    login() // Authenticate the employee
    navigate('/employee-dashboard')
  }

  /* ── Success Onboarding Screen ── */
  if (submitted) {
    return (
      <div className="ef-success-screen">
        <motion.div
          className="ef-success-card"
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <div className="ef-success-icon">
            <UserCheck size={48} strokeWidth={1.5} />
          </div>
          <h2 className="ef-success-title">Onboarding Submitted!</h2>
          <p className="ef-success-sub">
            Your document verification is currently in progress. Our administration panel
            will review your submitted files within 24 hours. You can now log in to the application.
          </p>
          <div className="ef-success-meta">
            <div className="ef-success-row">
              <span>Vehicle Category</span>
              <span>{VEHICLE_CATEGORIES.find(c => c.id === category)?.label ?? '—'}</span>
            </div>
            <div className="ef-success-row">
              <span>RC Number</span>
              <span>{rcNumber}</span>
            </div>
            <div className="ef-success-row">
              <span>Driving License</span>
              <span>{dlNumber}</span>
            </div>
            <div className="ef-success-row ef-success-status">
              <span>Verification Status</span>
              <span>Pending Review</span>
            </div>
          </div>
          <button className="ef-success-btn" onClick={handleComplete}>
            Login &amp; Go to Dashboard <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="ef-page">
      {/* ── Top bar ── */}
      <div className="ef-topbar">
        <button className="ef-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="ef-topbar-center">
          <span className="ef-type-pill">Employee Onboarding</span>
        </div>
        <div className="ef-topbar-right">
          Step 2 of 2
        </div>
      </div>

      {/* ── Page header ── */}
      <div className="ef-header">
        <h1 className="ef-main-title">
          Complete Your<br />
          <span className="ef-title-accent">Rider Profile</span>
        </h1>
        <p className="ef-header-sub">
          Submit your vehicle info, Driving License, identity documents, and profile photo to get approved.
        </p>
      </div>

      <form className="ef-form" onSubmit={handleSubmit} noValidate>

        {/* ══ SECTION 1 — Vehicle Category ══ */}
        <motion.section
          className="ef-section"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <SectionHead num="01" label="Choose Vehicle Type" />
          <p className="ef-section-sub">
            Select the category of the vehicle you will operate for RideXpress services.
          </p>

          <Field label="Vehicle Category" required>
            <CategoryDropdown value={category} onChange={setCategory} />
            {errors.category && <span className="ef-error">{errors.category}</span>}
          </Field>
        </motion.section>

        {/* ══ SECTION 2 — Vehicle Documents ══ */}
        <motion.section
          className="ef-section"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <SectionHead num="02" label="Vehicle Registration Certificate (RC) & Insurance" />
          
          <div className="ef-row">
            <Field label="RC Registration Number" required>
              <div className="ef-input-icon-wrap">
                <FileText size={15} className="ef-input-icon" />
                <input
                  className={`ef-input ef-input-icon-pad ${errors.rcNumber ? 'ef-input-error' : ''}`}
                  placeholder="e.g. MH-12-AB-1234"
                  value={rcNumber}
                  onChange={e => setRcNumber(e.target.value.toUpperCase())}
                />
              </div>
              {errors.rcNumber && <span className="ef-error">{errors.rcNumber}</span>}
            </Field>

            <DocumentUpload
              label="RC Book Photo / Copy"
              preview={rcPhoto}
              onFile={handlePhotoUpload(setRcPhoto)}
            />
          </div>
          {errors.rcPhoto && <span className="ef-error">{errors.rcPhoto}</span>}

          <div className="ef-divider" />

          <div className="ef-row">
            <Field label="Insurance Policy Number" required>
              <div className="ef-input-icon-wrap">
                <Shield size={15} className="ef-input-icon" />
                <input
                  className={`ef-input ef-input-icon-pad ${errors.insNumber ? 'ef-input-error' : ''}`}
                  placeholder="Policy No. (e.g. 100201/XX/...)"
                  value={insNumber}
                  onChange={e => setInsNumber(e.target.value)}
                />
              </div>
              {errors.insNumber && <span className="ef-error">{errors.insNumber}</span>}
            </Field>

            <DocumentUpload
              label="Insurance Document Photo"
              preview={insPhoto}
              onFile={handlePhotoUpload(setInsPhoto)}
            />
          </div>
          {errors.insPhoto && <span className="ef-error">{errors.insPhoto}</span>}
        </motion.section>

        {/* ══ SECTION 3 — Driving License ══ */}
        <motion.section
          className="ef-section"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <SectionHead num="03" label="Driving License Details" />
          
          <div className="ef-row">
            <Field label="DL Number" required>
              <div className="ef-input-icon-wrap">
                <Key size={15} className="ef-input-icon" />
                <input
                  className={`ef-input ef-input-icon-pad ${errors.dlNumber ? 'ef-input-error' : ''}`}
                  placeholder="e.g. DL-142011XXXXXXX"
                  value={dlNumber}
                  onChange={e => setDlNumber(e.target.value.toUpperCase())}
                />
              </div>
              {errors.dlNumber && <span className="ef-error">{errors.dlNumber}</span>}
            </Field>

            <Field label="DL Expiry Date" required>
              <div className="ef-input-icon-wrap">
                <Calendar size={15} className="ef-input-icon" />
                <input
                  type="date"
                  className={`ef-input ef-input-icon-pad ${errors.dlExpiry ? 'ef-input-error' : ''}`}
                  value={dlExpiry}
                  onChange={e => setDlExpiry(e.target.value)}
                />
              </div>
              {errors.dlExpiry && <span className="ef-error">{errors.dlExpiry}</span>}
            </Field>
          </div>

          <div className="ef-row-full mt-2">
            <DocumentUpload
              label="Driving License Front Photo"
              preview={dlPhoto}
              onFile={handlePhotoUpload(setDlPhoto)}
            />
            {errors.dlPhoto && <span className="ef-error">{errors.dlPhoto}</span>}
          </div>
        </motion.section>

        {/* ══ SECTION 4 — Identity Document ══ */}
        <motion.section
          className="ef-section"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <SectionHead num="04" label="Personal Identity Document" />
          
          <div className="ef-row">
            <Field label="Document Type" required>
              <select
                className="ef-select"
                value={idType}
                onChange={e => setIdType(e.target.value)}
              >
                <option value="Aadhaar">Aadhaar Card</option>
                <option value="PAN">PAN Card</option>
                <option value="VoterID">Voter ID</option>
              </select>
            </Field>

            <Field label="Document Number" required>
              <div className="ef-input-icon-wrap">
                <Landmark size={15} className="ef-input-icon" />
                <input
                  className={`ef-input ef-input-icon-pad ${errors.idNumber ? 'ef-input-error' : ''}`}
                  placeholder={`Enter ${idType} Number`}
                  value={idNumber}
                  onChange={e => setIdNumber(e.target.value.toUpperCase())}
                />
              </div>
              {errors.idNumber && <span className="ef-error">{errors.idNumber}</span>}
            </Field>
          </div>

          <div className="ef-row-full mt-2">
            <DocumentUpload
              label={`${idType} Document Photo`}
              preview={idPhoto}
              onFile={handlePhotoUpload(setIdPhoto)}
            />
            {errors.idPhoto && <span className="ef-error">{errors.idPhoto}</span>}
          </div>
        </motion.section>

        {/* ══ SECTION 5 — Rider Photo ══ */}
        <motion.section
          className="ef-section"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <SectionHead num="05" label="Rider Profile Photo" />
          <p className="ef-section-sub">
            Please take a clear headshot photo (selfie) in a well-lit environment. 
            This photo will be displayed to customers when you accept their ride.
          </p>

          <div className="ef-row-full">
            <DocumentUpload
              label="Rider Profile Photo (Selfie)"
              preview={riderPhoto}
              onFile={handlePhotoUpload(setRiderPhoto)}
            />
            {errors.riderPhoto && <span className="ef-error">{errors.riderPhoto}</span>}
          </div>
        </motion.section>

        {/* ══ SUBMIT ══ */}
        <motion.div
          className="ef-submit-wrap"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5 }}
        >
          {Object.keys(errors).length > 0 && (
            <div className="ef-form-error">
              <AlertCircle size={15} />
              Please fill all required fields and upload the necessary documents.
            </div>
          )}
          <button type="submit" className="ef-submit-btn">
            Complete Onboarding &amp; Register
            <ArrowRight size={18} strokeWidth={2} />
          </button>
          <p className="ef-submit-note">
            By submitting, you agree to RideXpress Driver Partner terms and conditions.
          </p>
        </motion.div>

      </form>
    </div>
  )
}
