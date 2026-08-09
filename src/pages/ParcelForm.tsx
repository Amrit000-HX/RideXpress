/**
 * ParcelForm.tsx
 * Full parcel booking form — triggered from DeliverParcel card CTAs.
 * Receives deliveryType: 'local' | 'longDistance' via router state.
 *
 * Fields:
 *  1. Category (searchable dropdown)
 *  2. Weight (kg stepper)
 *  3. Dimensions (optional)
 *  4. Parcel photo (upload or camera)
 *  5. Pickup address, city, pincode
 *  6. Pickup date & time
 *  7. Receiver name + phone
 *  8. Drop address, city, pincode
 *  9. Special instructions
 * 10. Insurance toggle (long-distance only)
 * 11. Fare estimate preview
 * 12. Submit
 *
 * Theme: Cream #F5F0E8 · Sage-Green #6B9E72 · Charcoal #1A1A1A
 */
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  Package, Camera, Upload, MapPin,
  Calendar, Clock3, User, Phone, Truck, Shield,
  ChevronDown, CheckCircle2, ArrowRight, ArrowLeft,
  Info, AlertCircle,
} from 'lucide-react'
import './ParcelForm.css'

/* ── Parcel categories ──────────────────────────────── */
const CATEGORIES = [
  { id: 'documents',   label: 'Documents & Papers',   icon: '📄', desc: 'Letters, certificates, contracts' },
  { id: 'electronics', label: 'Electronics & Gadgets', icon: '💻', desc: 'Phones, laptops, accessories' },
  { id: 'clothing',    label: 'Clothing & Fashion',    icon: '👗', desc: 'Clothes, shoes, accessories' },
  { id: 'food',        label: 'Food & Perishables',    icon: '🍱', desc: 'Homemade food, groceries' },
  { id: 'fragile',     label: 'Fragile / Glassware',   icon: '🫙', desc: 'Glass, ceramics, art' },
  { id: 'medicines',   label: 'Medicines & Healthcare', icon: '💊', desc: 'Prescription, OTC medicines' },
  { id: 'books',       label: 'Books & Stationery',    icon: '📚', desc: 'Textbooks, notebooks, files' },
  { id: 'furniture',   label: 'Furniture & Home',      icon: '🛋️', desc: 'Small furniture, décor' },
  { id: 'jewellery',   label: 'Jewellery & Valuables',  icon: '💍', desc: 'Gold, silver, collectibles' },
  { id: 'automotive',  label: 'Auto & Spare Parts',    icon: '🔧', desc: 'Car, bike, cycle parts' },
  { id: 'sports',      label: 'Sports & Fitness',      icon: '🏋️', desc: 'Equipment, gear, apparel' },
  { id: 'other',       label: 'Other / General',       icon: '📦', desc: 'Anything not listed above' },
]

/* ── Fare calculation ───────────────────────────────── */
function calcFare(type: 'local' | 'longDistance', weight: number, insured: boolean) {
  if (type === 'local') {
    const base = 80
    const perKg = 15
    return Math.round(base + Math.max(0, weight) * perKg)
  }
  const base  = 299
  const perKg = 35
  const raw   = Math.round(base + Math.max(0, weight) * perKg)
  return insured ? Math.round(raw * 1.08) : raw
}

/* ── Animated section heading ───────────────────────── */
function SectionHead({ num, label }: { num: string; label: string }) {
  return (
    <div className="pf-section-head">
      <span className="pf-section-num">{num}</span>
      <span className="pf-section-label">{label}</span>
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
  const selected = CATEGORIES.find(c => c.id === value)

  const filtered = query
    ? CATEGORIES.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.desc.toLowerCase().includes(query.toLowerCase())
      )
    : CATEGORIES

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.pf-cat-wrap')) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <div className="pf-cat-wrap">
      <button
        type="button"
        className={`pf-cat-trigger ${open ? 'pf-cat-open' : ''} ${value ? 'pf-cat-selected' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="pf-cat-trigger-left">
          {selected ? (
            <>
              <span className="pf-cat-icon">{selected.icon}</span>
              <span className="pf-cat-name">{selected.label}</span>
            </>
          ) : (
            <span className="pf-cat-placeholder">Select parcel category…</span>
          )}
        </span>
        <ChevronDown size={16} className={`pf-chevron ${open ? 'pf-chevron-up' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="pf-cat-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Search */}
            <div className="pf-cat-search">
              <input
                ref={inputRef}
                className="pf-cat-search-input"
                placeholder="Search categories…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>

            <div className="pf-cat-list">
              {filtered.length === 0 ? (
                <div className="pf-cat-empty">No category found</div>
              ) : filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`pf-cat-item ${c.id === value ? 'pf-cat-item-active' : ''}`}
                  onClick={() => { onChange(c.id); setOpen(false); setQuery('') }}
                >
                  <span className="pf-cat-item-icon">{c.icon}</span>
                  <span className="pf-cat-item-info">
                    <span className="pf-cat-item-name">{c.label}</span>
                    <span className="pf-cat-item-desc">{c.desc}</span>
                  </span>
                  {c.id === value && <CheckCircle2 size={14} className="pf-cat-check" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Weight Stepper ─────────────────────────────────── */
function WeightStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const inc = () => onChange(+(value + 0.5).toFixed(1))
  const dec = () => onChange(+(Math.max(0.5, value - 0.5)).toFixed(1))

  return (
    <div className="pf-weight-wrap">
      <button type="button" className="pf-weight-btn" onClick={dec}>−</button>
      <div className="pf-weight-display">
        <input
          type="number"
          min={0.5} max={999} step={0.5}
          className="pf-weight-input"
          value={value}
          onChange={e => onChange(Math.max(0.5, Number(e.target.value)))}
        />
        <span className="pf-weight-unit">kg</span>
      </div>
      <button type="button" className="pf-weight-btn" onClick={inc}>+</button>
    </div>
  )
}

/* ── Photo Upload ────────────────────────────────────── */
function PhotoUpload({
  preview, onFile,
}: {
  preview: string | null; onFile: (f: File) => void
}) {
  const fileRef   = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onFile(f)
  }

  return (
    <div className="pf-photo-area">
      {preview ? (
        <div className="pf-photo-preview">
          <img src={preview} alt="Parcel preview" className="pf-photo-img" />
          <div className="pf-photo-actions">
            <button type="button" className="pf-photo-rebtn" onClick={() => fileRef.current?.click()}>
              <Upload size={13} /> Change Photo
            </button>
            <button type="button" className="pf-photo-rebtn" onClick={() => cameraRef.current?.click()}>
              <Camera size={13} /> Retake
            </button>
          </div>
        </div>
      ) : (
        <div className="pf-photo-empty">
          <div className="pf-photo-icon-wrap">
            <Package size={32} strokeWidth={1} />
          </div>
          <p className="pf-photo-hint">
            Add a photo so our team can identify and handle your parcel correctly
          </p>
          <div className="pf-photo-btns">
            <button
              type="button"
              className="pf-photo-btn pf-photo-btn-outline"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={15} /> Upload from Device
            </button>
            <button
              type="button"
              className="pf-photo-btn pf-photo-btn-solid"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera size={15} /> Use Camera
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
    <div className="pf-field">
      <label className="pf-label">
        {label}
        {required && <span className="pf-required">*</span>}
        {hint && (
          <span className="pf-hint-tooltip" title={hint}>
            <Info size={11} />
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

/* ── Main Form Component ─────────────────────────────── */
export default function ParcelForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  /* deliveryType comes from navigate state */
  const deliveryType: 'local' | 'longDistance' =
    (location.state as any)?.deliveryType ?? 'local'
  const isLong = deliveryType === 'longDistance'

  /* Auth guard */
  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { state: { from: '/deliver' } })
  }, [isAuthenticated, navigate])

  useEffect(() => { window.scrollTo(0, 0) }, [])

  /* ── Form state ── */
  const [category,     setCategory]    = useState('')
  const [weight,       setWeight]      = useState(1)
  const [dimL,         setDimL]        = useState('')
  const [dimW,         setDimW]        = useState('')
  const [dimH,         setDimH]        = useState('')
  const [photoPreview, setPhotoPreview]= useState<string | null>(null)
  const [pickupAddr,   setPickupAddr]  = useState('')
  const [pickupCity,   setPickupCity]  = useState('')
  const [pickupPin,    setPickupPin]   = useState('')
  const [pickupDate,   setPickupDate]  = useState('')
  const [pickupTime,   setPickupTime]  = useState('')
  const [recvName,     setRecvName]    = useState('')
  const [recvPhone,    setRecvPhone]   = useState('')
  const [dropAddr,     setDropAddr]    = useState('')
  const [dropCity,     setDropCity]    = useState('')
  const [dropPin,      setDropPin]     = useState('')
  const [instructions, setInstructions]= useState('')
  const [insured,      setInsured]     = useState(false)
  const [submitted,    setSubmitted]   = useState(false)
  const [errors,       setErrors]      = useState<Record<string, string>>({})

  /* Photo handler */
  const handlePhoto = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => setPhotoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  /* Fare */
  const fare = calcFare(deliveryType, weight, insured)

  /* Validation */
  const validate = () => {
    const e: Record<string, string> = {}
    if (!category)   e.category   = 'Please select a category'
    if (!pickupAddr) e.pickupAddr = 'Pickup address is required'
    if (!pickupCity) e.pickupCity = 'City is required'
    if (!pickupPin || pickupPin.length !== 6) e.pickupPin = 'Valid 6-digit pincode required'
    if (!pickupDate) e.pickupDate = 'Pickup date is required'
    if (!pickupTime) e.pickupTime = 'Pickup time is required'
    if (!recvName)   e.recvName   = 'Receiver name is required'
    if (!recvPhone || recvPhone.length < 10) e.recvPhone = 'Valid phone number required'
    if (!dropAddr)   e.dropAddr   = 'Drop address is required'
    if (!dropCity)   e.dropCity   = 'City is required'
    if (!dropPin || dropPin.length !== 6) e.dropPin = 'Valid 6-digit pincode required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      document.querySelector('.pf-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setSubmitted(true)
  }

  if (!isAuthenticated) return null

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="pf-success-screen">
        <motion.div
          className="pf-success-card"
          initial={{ scale: 0.88, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <div className="pf-success-icon">
            <CheckCircle2 size={48} strokeWidth={1.5} />
          </div>
          <h2 className="pf-success-title">Booking Confirmed!</h2>
          <p className="pf-success-sub">
            Your parcel pickup has been scheduled. Our partner will arrive at your
            location on <strong>{pickupDate}</strong> at <strong>{pickupTime}</strong>.
          </p>
          <div className="pf-success-meta">
            <div className="pf-success-row">
              <span>Parcel type</span>
              <span>{CATEGORIES.find(c => c.id === category)?.label ?? '—'}</span>
            </div>
            <div className="pf-success-row">
              <span>Weight</span>
              <span>{weight} kg</span>
            </div>
            <div className="pf-success-row">
              <span>Route</span>
              <span>{isLong ? 'Long-Distance / State' : 'Within 100 KM'}</span>
            </div>
            <div className="pf-success-row pf-success-fare">
              <span>Estimated fare</span>
              <span>₹{fare.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <button className="pf-success-btn" onClick={() => navigate('/')}>
            Back to Home <ArrowRight size={16} />
          </button>
        </motion.div>
      </div>
    )
  }

  /* ── Main Form ── */
  return (
    <div className="pf-page">
      {/* ── Top bar ── */}
      <div className="pf-topbar">
        <button className="pf-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="pf-topbar-center">
          <span className="pf-type-pill">
            {isLong ? '100 KM+ / State & Abroad' : 'Within 100 KM Radius'}
          </span>
        </div>
        <div className="pf-topbar-fare">
          Est. ₹{fare.toLocaleString('en-IN')}
        </div>
      </div>

      {/* ── Page header ── */}
      <div className="pf-header">
        <h1 className="pf-main-title">
          Book Your<br />
          <span className="pf-title-accent">Parcel Delivery</span>
        </h1>
        <p className="pf-header-sub">
          Fill in the details below — our partner picks up within 2 hours.
        </p>
      </div>

      <form className="pf-form" onSubmit={handleSubmit} noValidate>

        {/* ══ SECTION 1 — What are you sending? ══ */}
        <motion.section
          className="pf-section"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <SectionHead num="01" label="What are you sending?" />

          <Field label="Parcel Category" required
            hint="Choose the closest match. This helps us assign the right handler.">
            <CategoryDropdown value={category} onChange={setCategory} />
            {errors.category && <span className="pf-error">{errors.category}</span>}
          </Field>

          <div className="pf-row">
            <Field label="Weight" required>
              <WeightStepper value={weight} onChange={setWeight} />
            </Field>

            <Field label="Dimensions (optional)" hint="Length × Width × Height in cm">
              <div className="pf-dims-row">
                <input className="pf-input pf-dim-input" placeholder="L" type="number" min={1}
                  value={dimL} onChange={e => setDimL(e.target.value)} />
                <span className="pf-dim-sep">×</span>
                <input className="pf-input pf-dim-input" placeholder="W" type="number" min={1}
                  value={dimW} onChange={e => setDimW(e.target.value)} />
                <span className="pf-dim-sep">×</span>
                <input className="pf-input pf-dim-input" placeholder="H" type="number" min={1}
                  value={dimH} onChange={e => setDimH(e.target.value)} />
                <span className="pf-dim-unit">cm</span>
              </div>
            </Field>
          </div>
        </motion.section>

        {/* ══ SECTION 2 — Parcel Photo ══ */}
        <motion.section
          className="pf-section"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <SectionHead num="02" label="Parcel Photo" />
          <p className="pf-section-sub">
            A photo helps our team verify and handle your parcel safely.
            You can upload from your gallery or take a fresh photo.
          </p>
          <PhotoUpload preview={photoPreview} onFile={handlePhoto} />
        </motion.section>

        {/* ══ SECTION 3 — Pickup Details ══ */}
        <motion.section
          className="pf-section"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <SectionHead num="03" label="Pickup Details" />

          <Field label="Pickup Address" required>
            <div className="pf-input-icon-wrap">
              <MapPin size={15} className="pf-input-icon" />
              <input
                className={`pf-input pf-input-icon-pad ${errors.pickupAddr ? 'pf-input-error' : ''}`}
                placeholder="House / flat no., street name, area…"
                value={pickupAddr}
                onChange={e => setPickupAddr(e.target.value)}
              />
            </div>
            {errors.pickupAddr && <span className="pf-error">{errors.pickupAddr}</span>}
          </Field>

          <div className="pf-row">
            <Field label="City" required>
              <input
                className={`pf-input ${errors.pickupCity ? 'pf-input-error' : ''}`}
                placeholder="e.g. Mumbai"
                value={pickupCity}
                onChange={e => setPickupCity(e.target.value)}
              />
              {errors.pickupCity && <span className="pf-error">{errors.pickupCity}</span>}
            </Field>
            <Field label="Pincode" required>
              <input
                className={`pf-input ${errors.pickupPin ? 'pf-input-error' : ''}`}
                placeholder="6-digit code"
                maxLength={6}
                value={pickupPin}
                onChange={e => setPickupPin(e.target.value.replace(/\D/g, ''))}
              />
              {errors.pickupPin && <span className="pf-error">{errors.pickupPin}</span>}
            </Field>
          </div>

          <div className="pf-row">
            <Field label="Pickup Date" required>
              <div className="pf-input-icon-wrap">
                <Calendar size={15} className="pf-input-icon" />
                <input
                  type="date"
                  className={`pf-input pf-input-icon-pad ${errors.pickupDate ? 'pf-input-error' : ''}`}
                  min={new Date().toISOString().split('T')[0]}
                  value={pickupDate}
                  onChange={e => setPickupDate(e.target.value)}
                />
              </div>
              {errors.pickupDate && <span className="pf-error">{errors.pickupDate}</span>}
            </Field>
            <Field label="Pickup Time" required>
              <div className="pf-input-icon-wrap">
                <Clock3 size={15} className="pf-input-icon" />
                <input
                  type="time"
                  className={`pf-input pf-input-icon-pad ${errors.pickupTime ? 'pf-input-error' : ''}`}
                  value={pickupTime}
                  onChange={e => setPickupTime(e.target.value)}
                />
              </div>
              {errors.pickupTime && <span className="pf-error">{errors.pickupTime}</span>}
            </Field>
          </div>
        </motion.section>

        {/* ══ SECTION 4 — Delivery Details ══ */}
        <motion.section
          className="pf-section"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <SectionHead num="04" label="Receiver Details" />

          <div className="pf-row">
            <Field label="Receiver Name" required>
              <div className="pf-input-icon-wrap">
                <User size={15} className="pf-input-icon" />
                <input
                  className={`pf-input pf-input-icon-pad ${errors.recvName ? 'pf-input-error' : ''}`}
                  placeholder="Full name of receiver"
                  value={recvName}
                  onChange={e => setRecvName(e.target.value)}
                />
              </div>
              {errors.recvName && <span className="pf-error">{errors.recvName}</span>}
            </Field>
            <Field label="Receiver Phone" required>
              <div className="pf-input-icon-wrap">
                <Phone size={15} className="pf-input-icon" />
                <input
                  className={`pf-input pf-input-icon-pad ${errors.recvPhone ? 'pf-input-error' : ''}`}
                  placeholder="+91 9XXXXXXXXX"
                  maxLength={13}
                  value={recvPhone}
                  onChange={e => setRecvPhone(e.target.value.replace(/[^0-9+]/g, ''))}
                />
              </div>
              {errors.recvPhone && <span className="pf-error">{errors.recvPhone}</span>}
            </Field>
          </div>

          <Field label="Drop Address" required>
            <div className="pf-input-icon-wrap">
              <MapPin size={15} className="pf-input-icon" />
              <input
                className={`pf-input pf-input-icon-pad ${errors.dropAddr ? 'pf-input-error' : ''}`}
                placeholder="House / flat no., street name, area…"
                value={dropAddr}
                onChange={e => setDropAddr(e.target.value)}
              />
            </div>
            {errors.dropAddr && <span className="pf-error">{errors.dropAddr}</span>}
          </Field>

          <div className="pf-row">
            <Field label="City" required>
              <input
                className={`pf-input ${errors.dropCity ? 'pf-input-error' : ''}`}
                placeholder="e.g. Delhi"
                value={dropCity}
                onChange={e => setDropCity(e.target.value)}
              />
              {errors.dropCity && <span className="pf-error">{errors.dropCity}</span>}
            </Field>
            <Field label="Pincode" required>
              <input
                className={`pf-input ${errors.dropPin ? 'pf-input-error' : ''}`}
                placeholder="6-digit code"
                maxLength={6}
                value={dropPin}
                onChange={e => setDropPin(e.target.value.replace(/\D/g, ''))}
              />
              {errors.dropPin && <span className="pf-error">{errors.dropPin}</span>}
            </Field>
          </div>
        </motion.section>

        {/* ══ SECTION 5 — Special Instructions & Insurance ══ */}
        <motion.section
          className="pf-section"
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
        >
          <SectionHead num="05" label="Additional Options" />

          <Field label="Special Instructions" hint="Fragile, handle with care, refrigeration needed, etc.">
            <textarea
              className="pf-textarea"
              placeholder="e.g. Fragile — please handle with care. Do not stack other packages on top."
              rows={3}
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
            />
          </Field>

          {/* Insurance toggle (long-distance only) */}
          {isLong && (
            <div className="pf-insurance-row">
              <div className="pf-insurance-info">
                <Shield size={18} className="pf-insurance-icon" />
                <div>
                  <div className="pf-insurance-title">Parcel Insurance</div>
                  <div className="pf-insurance-sub">
                    Cover up to ₹50,000 against loss or damage · +8% of base fare
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={`pf-toggle ${insured ? 'pf-toggle-on' : ''}`}
                onClick={() => setInsured(v => !v)}
                aria-label={insured ? 'Disable insurance' : 'Enable insurance'}
              >
                <motion.div
                  className="pf-toggle-thumb"
                  layout
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          )}
        </motion.section>

        {/* ══ FARE ESTIMATE CARD ══ */}
        <motion.div
          className="pf-fare-card"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5 }}
        >
          <div className="pf-fare-left">
            <div className="pf-fare-label">
              <Truck size={14} /> Estimated Fare
            </div>
            <div className="pf-fare-amount">₹{fare.toLocaleString('en-IN')}</div>
            <div className="pf-fare-breakdown">
              {isLong
                ? `₹299 base + ₹35/kg × ${weight}kg${insured ? ' + 8% insurance' : ''}`
                : `₹80 base + ₹15/kg × ${weight}kg`}
            </div>
          </div>
          <div className="pf-fare-right">
            <div className="pf-fare-tag">{isLong ? '100KM+' : 'Local'}</div>
            <div className="pf-fare-note">Final fare may vary based on actual distance & weight.</div>
          </div>
        </motion.div>

        {/* ══ SUBMIT ══ */}
        <motion.div
          className="pf-submit-wrap"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5 }}
        >
          {Object.keys(errors).length > 0 && (
            <div className="pf-form-error">
              <AlertCircle size={15} />
              Please fill all required fields correctly.
            </div>
          )}
          <button type="submit" className="pf-submit-btn">
            Confirm Booking — ₹{fare.toLocaleString('en-IN')}
            <ArrowRight size={18} strokeWidth={2} />
          </button>
          <p className="pf-submit-note">
            No payment now · Pay on pickup · Cancel up to 30 min before scheduled time
          </p>
        </motion.div>

      </form>
    </div>
  )
}
