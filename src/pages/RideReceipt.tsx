/**
 * RideReceipt.tsx — Ride Booking Confirmation & Bill / Invoice Page
 * Features:
 * - Animated Framer Motion SVG checkmark tick symbol
 * - Itemized digital bill with complete ride details:
 *   Customer name, Pickup/Drop addresses, Vehicle used, Rider/Driver info,
 *   Plate number, Distance, Start Ride PIN, and itemized price breakdown.
 * - RideXpress Noir & Sage palette: Cream #F5F0E8 · Sage #6B9E72 · Charcoal #1A1A1A
 * - Print / PDF invoice export support.
 */
import { useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import {
  Printer, ArrowRight, Home, Phone, Star,
  Shield, Check, Calendar, KeyRound, User,
} from 'lucide-react'
import './RideReceipt.css'

import imgScooty from '../assets/veh_scooty.png'
import imgBike   from '../assets/veh_bike.png'
import imgCar    from '../assets/veh_car.png'
import imgJeep   from '../assets/veh_jeep.png'
import imgSuv    from '../assets/veh_suv.png'

export interface RideReceiptData {
  bookingId:          string
  customerName:       string
  customerEmail:      string
  customerPhone?:     string
  pickupAddress:      string
  dropAddress:        string
  vehicleType:        string
  vehicleImage?:      string | null
  distanceKm:         number
  baseFare:           number
  distanceFare:       number
  serviceFee:         number
  taxAmount:          number
  totalFare:          number
  driverName:         string
  driverPhone:        string
  driverVehicleNumber:string
  driverRating:       number
  startRidePin:       string
  paymentMethod:      string
  bookedAt:           string
}

export default function RideReceipt() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Retrieve passed booking data or fallback to default sample
  const stateData = location.state as Partial<RideReceiptData> | undefined

  const vehicleType = stateData?.vehicleType || 'Scooty'
  const distanceKm  = stateData?.distanceKm  || 6.8
  const totalFare   = stateData?.totalFare   || 320

  // Calculate itemized breakdown
  const baseFare     = Math.round(totalFare * 0.25)
  const distanceFare = Math.round(totalFare * 0.65)
  const serviceFee   = 15
  const taxAmount    = Math.round((baseFare + distanceFare + serviceFee) * 0.05)
  const calculatedTotal = baseFare + distanceFare + serviceFee + taxAmount

  const receipt: RideReceiptData = {
    bookingId:          stateData?.bookingId          || `RX-RIDE-${Math.floor(100000 + Math.random() * 900000)}`,
    customerName:       stateData?.customerName       || user?.name || 'Customer',
    customerEmail:      stateData?.customerEmail      || user?.email || 'customer@ridexpress.com',
    customerPhone:      stateData?.customerPhone      || user?.phone || '+91 98765 43210',
    pickupAddress:      stateData?.pickupAddress      || 'Current Location (GPS Pinpoint), Main Street, City',
    dropAddress:        stateData?.dropAddress        || 'Selected Destination, Commercial Hub, Sector 4',
    vehicleType:        vehicleType,
    vehicleImage:       stateData?.vehicleImage       || (
                          vehicleType === 'Moto' ? imgBike :
                          vehicleType === 'XL SUV' ? imgSuv :
                          vehicleType === 'Jeep' ? imgJeep :
                          vehicleType === 'Sedan' || vehicleType === 'Hatchback' ? imgCar :
                          imgScooty
                        ),
    distanceKm:         distanceKm,
    baseFare:           baseFare,
    distanceFare:       distanceFare,
    serviceFee:         serviceFee,
    taxAmount:          taxAmount,
    totalFare:          stateData?.totalFare || calculatedTotal,
    driverName:         stateData?.driverName         || 'Arjun Mehta',
    driverPhone:        stateData?.driverPhone        || '+91 98451 23098',
    driverVehicleNumber:stateData?.driverVehicleNumber|| 'MH 02 EQ 8492',
    driverRating:       stateData?.driverRating       || 4.94,
    startRidePin:       stateData?.startRidePin       || '4821',
    paymentMethod:      stateData?.paymentMethod      || 'Cash on Delivery / UPI',
    bookedAt:           stateData?.bookedAt           || new Date().toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }),
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="rc-page">
      <div className="rc-container">

        {/* ── 1. ANIMATED SUCCESS CHECKMARK HEADER ── */}
        <motion.div
          className="rc-success-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Animated SVG Circle & Checkmark Tick */}
          <div className="rc-tick-wrapper">
            <motion.div
              className="rc-tick-circle"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            >
              <svg className="rc-tick-svg" viewBox="0 0 52 52">
                <motion.circle
                  className="rc-tick-circle-bg"
                  cx="26"
                  cy="26"
                  r="24"
                  fill="none"
                  stroke="#6B9E72"
                  strokeWidth="3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                />
                <motion.path
                  className="rc-tick-check"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 27l8 8 16-16"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
                />
              </svg>
            </motion.div>
          </div>

          <motion.h1
            className="rc-success-title"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Booking Confirmed!
          </motion.h1>
          <motion.p
            className="rc-success-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Your ride has been scheduled. Your assigned driver is heading to your pickup location.
          </motion.p>
        </motion.div>

        {/* ── 2. DIGITAL INVOICE / BILL CARD ── */}
        <motion.div
          className="rc-bill-card"
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Top Bar of Bill */}
          <div className="rc-bill-top">
            <div className="rc-brand-block">
              <span className="rc-logo-text">Ride<span className="rc-rx">X</span>press</span>
              <span className="rc-badge-invoice">Official Tax Receipt</span>
            </div>
            <div className="rc-inv-meta">
              <span className="rc-meta-num">{receipt.bookingId}</span>
              <span className="rc-meta-date"><Calendar size={11} /> {receipt.bookedAt}</span>
            </div>
          </div>

          {/* OTP PIN Alert Banner */}
          <div className="rc-pin-banner">
            <div className="rc-pin-left">
              <KeyRound size={18} className="rc-pin-icon" />
              <div>
                <div className="rc-pin-title">Start Ride OTP PIN</div>
                <div className="rc-pin-desc">Share this 4-digit code with your driver upon arrival</div>
              </div>
            </div>
            <div className="rc-pin-code">{receipt.startRidePin}</div>
          </div>

          {/* Driver & Customer Info Grid */}
          <div className="rc-parties-grid">
            {/* Driver Profile */}
            <div className="rc-party-box rc-driver-box">
              <span className="rc-party-label">Assigned Driver &amp; Vehicle</span>
              <div className="rc-driver-row">
                <div className="rc-driver-avatar">
                  {receipt.driverName.charAt(0)}
                </div>
                <div className="rc-driver-details">
                  <div className="rc-driver-name">
                    {receipt.driverName}
                    <span className="rc-rating-tag"><Star size={11} fill="#f59e0b" color="#f59e0b" /> {receipt.driverRating}</span>
                  </div>
                  <div className="rc-driver-vehicle">
                    <strong>{receipt.vehicleType}</strong> · <span className="rc-plate-pill">{receipt.driverVehicleNumber}</span>
                  </div>
                  <div className="rc-driver-phone">
                    <Phone size={11} /> {receipt.driverPhone}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="rc-party-box rc-customer-box">
              <span className="rc-party-label">Passenger Information</span>
              <div className="rc-customer-row">
                <div className="rc-cust-name"><User size={13} /> {receipt.customerName}</div>
                <div className="rc-cust-email">{receipt.customerEmail}</div>
                {receipt.customerPhone && (
                  <div className="rc-cust-phone"><Phone size={11} /> {receipt.customerPhone}</div>
                )}
                <div className="rc-status-pill"><Check size={11} /> Verified Passenger</div>
              </div>
            </div>
          </div>

          {/* Route Section */}
          <div className="rc-route-block">
            <span className="rc-section-label">Trip Route Details</span>
            <div className="rc-route-timeline">
              {/* Pickup */}
              <div className="rc-route-point">
                <span className="rc-point-dot rc-dot-green" />
                <div className="rc-point-info">
                  <span className="rc-point-type">Pickup Point</span>
                  <span className="rc-point-addr">{receipt.pickupAddress}</span>
                </div>
              </div>

              {/* Distance Line */}
              <div className="rc-route-connector">
                <span className="rc-distance-tag">📏 {receipt.distanceKm} km trip distance</span>
              </div>

              {/* Drop */}
              <div className="rc-route-point">
                <span className="rc-point-dot rc-dot-red" />
                <div className="rc-point-info">
                  <span className="rc-point-type">Destination</span>
                  <span className="rc-point-addr">{receipt.dropAddress}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Bill / Fare Breakdown */}
          <div className="rc-fare-breakdown">
            <span className="rc-section-label">Itemized Fare Breakdown</span>
            <div className="rc-fare-table">
              <div className="rc-fare-row">
                <span>Base Fare ({receipt.vehicleType})</span>
                <span>₹{receipt.baseFare.toFixed(2)}</span>
              </div>
              <div className="rc-fare-row">
                <span>Distance Charge ({receipt.distanceKm} km)</span>
                <span>₹{receipt.distanceFare.toFixed(2)}</span>
              </div>
              <div className="rc-fare-row">
                <span>Platform &amp; Safety Service Fee</span>
                <span>₹{receipt.serviceFee.toFixed(2)}</span>
              </div>
              <div className="rc-fare-row">
                <span>GST / Taxes (5%)</span>
                <span>₹{receipt.taxAmount.toFixed(2)}</span>
              </div>

              {/* Total Row */}
              <div className="rc-fare-total-row">
                <div className="rc-total-left">
                  <span className="rc-total-label">Total Amount Payable</span>
                  <span className="rc-payment-mode">Payment via {receipt.paymentMethod}</span>
                </div>
                <div className="rc-total-amount">
                  ₹{receipt.totalFare.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Bill Footer Note */}
          <div className="rc-bill-footer">
            <div className="rc-footer-secure">
              <Shield size={13} /> Official RideXpress E-Receipt · 100% Secure Transaction
            </div>
            <div className="rc-barcode">
              ||| | ||||| || |||| |||||| |||| | ||| ||||||| | |||
            </div>
          </div>

        </motion.div>

        {/* ── 3. ACTION BUTTONS ── */}
        <motion.div
          className="rc-actions-bar"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <button className="rc-btn rc-btn-print" onClick={handlePrint}>
            <Printer size={16} /> Print / Save Invoice
          </button>

          <button className="rc-btn rc-btn-primary" onClick={() => navigate('/book')}>
            Book Another Ride <ArrowRight size={16} />
          </button>

          <Link to="/" className="rc-btn rc-btn-outline">
            <Home size={15} /> Back to Home
          </Link>
        </motion.div>

      </div>
    </div>
  )
}
