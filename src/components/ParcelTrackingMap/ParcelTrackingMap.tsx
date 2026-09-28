/**
 * ParcelTrackingMap.tsx
 * Full-Window Interactive Map for Live Parcel Tracking & Confirmation.
 * Stack: Leaflet.js · OpenStreetMap · OSRM Road Routing
 * Palette: Cream #F5F0E8 · Sage-Green #6B9E72 · Charcoal #1A1A1A
 */
import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, MapPin, Truck, Phone, Star, Shield,
  ArrowLeft, CheckCircle2, Copy, Check, MessageSquare,
  Navigation, Clock, KeyRound, ExternalLink,
} from 'lucide-react'
import ChatBox from '../ChatBox'
import './ParcelTrackingMap.css'

/* Fix default Leaflet marker icon */
import markerUrl from 'leaflet/dist/images/marker-icon.png'
import markerRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerUrl,
  iconRetinaUrl: markerRetinaUrl,
  shadowUrl: markerShadowUrl,
})

/* Custom SVG pins */
const customPin = (color: string, label: string) =>
  L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
      <div style="background:${color};color:#ffffff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:6px;white-space:nowrap;margin-bottom:2px;box-shadow:0 3px 8px rgba(0,0,0,0.4);letter-spacing:0.5px;">${label}</div>
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
        <path fill="${color}" stroke="#ffffff" stroke-width="2"
          d="M15 1C7.3 1 1 7.3 1 15c0 10 14 26 14 26S29 25 29 15C29 7.3 22.7 1 15 1z"/>
        <circle fill="#ffffff" cx="15" cy="15" r="5"/>
      </svg>
    </div>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
  })

const pickupMarkerIcon   = customPin('#6B9E72', 'PICKUP')
const deliveryMarkerIcon = customPin('#e74c3c', 'DELIVERY')

/* Courier Partner Live Pin */
const courierVehiclePin = (heading: number = 45) =>
  L.divIcon({
    className: '',
    html: `
      <div style="transform: translate(-50%, -50%) rotate(${heading}deg); transition: transform 0.4s ease-out; display: flex; align-items: center; justify-content: center;">
        <div style="position: relative; width: 44px; height: 44px; background: #1A1A1A; border: 2.5px solid #6B9E72; border-radius: 50%; box-shadow: 0 4px 18px rgba(107,158,114,0.5); display: flex; align-items: center; justify-content: center; color: #F5F0E8;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6B9E72" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
          <span style="position: absolute; top: -3px; right: -3px; width: 10px; height: 10px; background: #6B9E72; border-radius: 50%; border: 1.5px solid #1A1A1A;"></span>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })

export interface ParcelTrackingData {
  id?: string
  trackingId: string
  category: string
  weightKg: number
  deliveryType: 'local' | 'longDistance'
  pickup: {
    address: string
    city: string
    pincode: string
    lat: number
    lng: number
    date: string
    time: string
  }
  receiver: {
    name: string
    phone: string
    address: string
    city: string
    pincode: string
    lat: number
    lng: number
  }
  fare: number
  insured?: boolean
  instructions?: string
  pickupPin: string
  deliveryPin: string
  courierName?: string
  courierPhone?: string
  courierVehicleNumber?: string
  courierRating?: number
  status?: string
}

interface ParcelTrackingMapProps {
  parcel: ParcelTrackingData
  onClose: () => void
}

/**
 * Bounds fitter for Leaflet
 */
function MapBoundsFitter({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length >= 2) {
      const b = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])))
      map.fitBounds(b, { padding: [60, 60], maxZoom: 15 })
    }
  }, [map, points])
  return null
}

export default function ParcelTrackingMap({ parcel, onClose }: ParcelTrackingMapProps) {
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([])
  const [courierPos, setCourierPos]       = useState<[number, number]>([parcel.pickup.lat, parcel.pickup.lng])
  const [copied, setCopied]               = useState(false)
  const [showChat, setShowChat]           = useState(false)
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(parcel.deliveryType === 'longDistance' ? 140 : 12.8)
  const [courierEtaMin, setCourierEtaMin]     = useState<number>(18)

  const pickupLat = parcel.pickup.lat || 19.0760
  const pickupLng = parcel.pickup.lng || 72.8777
  const dropLat   = parcel.receiver.lat || 19.1136
  const dropLng   = parcel.receiver.lng || 72.8697

  // Fetch real road route from OSRM
  useEffect(() => {
    let active = true
    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropLng},${dropLat}?overview=full&geometries=geojson`
        const res = await fetch(url)
        const data = await res.json()
        if (active && data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
          )
          setRoutePolyline(coords)
          const distKm = Math.round((data.routes[0].distance / 1000) * 10) / 10
          setRouteDistanceKm(distKm)
          setCourierEtaMin(Math.max(5, Math.round(distKm * 2.2)))

          // Position courier along 25% of the route
          if (coords.length > 4) {
            const courierIdx = Math.floor(coords.length * 0.25)
            setCourierPos(coords[courierIdx])
          }
        }
      } catch (err) {
        // Fallback straight line
        if (active) {
          setRoutePolyline([[pickupLat, pickupLng], [dropLat, dropLng]])
        }
      }
    }
    fetchRoute()
    return () => { active = false }
  }, [pickupLat, pickupLng, dropLat, dropLng])

  const copyTrackingId = () => {
    navigator.clipboard.writeText(parcel.trackingId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="ptm-container">
      {/* ── Top Bar ── */}
      <div className="ptm-topbar">
        <button className="ptm-back-btn" onClick={onClose}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="ptm-title-block">
          <div className="ptm-live-pill">
            <span className="ptm-pulse-dot" /> LIVE PARCEL TRACKING
          </div>
          <span className="ptm-tracking-code">{parcel.trackingId}</span>
        </div>
        <div className="ptm-eta-pill">
          <Clock size={13} />
          <span>Courier ETA: ~{courierEtaMin} min ({routeDistanceKm} km)</span>
        </div>
      </div>

      {/* ── Leaflet Map Area ── */}
      <div className="ptm-map-viewport">
        <MapContainer
          center={[pickupLat, pickupLng]}
          zoom={13}
          zoomControl={false}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          {/* Pickup Marker */}
          <Marker position={[pickupLat, pickupLng]} icon={pickupMarkerIcon} />

          {/* Drop Marker */}
          <Marker position={[dropLat, dropLng]} icon={deliveryMarkerIcon} />

          {/* Courier Live Pin */}
          <Marker position={courierPos} icon={courierVehiclePin(40)} />

          {/* Road Polyline Route */}
          {routePolyline.length > 0 && (
            <Polyline
              positions={routePolyline}
              pathOptions={{
                color: '#6B9E72',
                weight: 5,
                opacity: 0.9,
                dashArray: '2, 6',
              }}
            />
          )}

          <MapBoundsFitter points={[[pickupLat, pickupLng], [dropLat, dropLng], courierPos]} />
        </MapContainer>
      </div>

      {/* ── Floating Tracking & Status Drawer ── */}
      <div className="ptm-drawer">
        {/* Header row with Status & Copy */}
        <div className="ptm-drawer-header">
          <div>
            <div className="ptm-badge-row">
              <span className="ptm-status-badge">Courier Partner Assigned</span>
              <span className="ptm-type-tag">
                {parcel.deliveryType === 'longDistance' ? 'Long Distance (100KM+)' : 'Local Express'}
              </span>
            </div>
            <h2 className="ptm-header-title">Pickup Scheduled for Today</h2>
            <p className="ptm-header-sub">
              {parcel.pickup.date} at {parcel.pickup.time} · {parcel.category} ({parcel.weightKg} kg)
            </p>
          </div>
          <button className="ptm-copy-btn" onClick={copyTrackingId}>
            {copied ? <Check size={14} color="#6B9E72" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : parcel.trackingId}</span>
          </button>
        </div>

        {/* Security OTP Verification Codes */}
        <div className="ptm-otp-grid">
          <div className="ptm-otp-card ptm-otp-pickup">
            <div className="ptm-otp-label">
              <KeyRound size={13} /> Pickup Verification OTP
            </div>
            <div className="ptm-otp-value">{parcel.pickupPin || '4821'}</div>
            <div className="ptm-otp-hint">Share with courier at your door upon handoff</div>
          </div>
          <div className="ptm-otp-card ptm-otp-delivery">
            <div className="ptm-otp-label">
              <KeyRound size={13} /> Delivery PIN Code
            </div>
            <div className="ptm-otp-value">{parcel.deliveryPin || '9143'}</div>
            <div className="ptm-otp-hint">Receiver ({parcel.receiver.name}) provides this to release</div>
          </div>
        </div>

        {/* Route Details Card */}
        <div className="ptm-route-card">
          <div className="ptm-route-point">
            <span className="ptm-point-bullet ptm-point-green" />
            <div>
              <span className="ptm-point-lbl">PICKUP ADDRESS</span>
              <div className="ptm-point-val">{parcel.pickup.address}, {parcel.pickup.city} - {parcel.pickup.pincode}</div>
            </div>
          </div>
          <div className="ptm-route-divider" />
          <div className="ptm-route-point">
            <span className="ptm-point-bullet ptm-point-red" />
            <div>
              <span className="ptm-point-lbl">DELIVER TO: {parcel.receiver.name} ({parcel.receiver.phone})</span>
              <div className="ptm-point-val">{parcel.receiver.address}, {parcel.receiver.city} - {parcel.receiver.pincode}</div>
            </div>
          </div>
        </div>

        {/* Courier Partner Profile & Actions */}
        <div className="ptm-footer-bar">
          <div className="ptm-courier-profile">
            <div className="ptm-courier-avatar">
              {(parcel.courierName || 'Vikram').charAt(0)}
            </div>
            <div>
              <div className="ptm-courier-name">
                {parcel.courierName || 'Vikram Joshi'}
                <span className="ptm-rating-pill">
                  <Star size={11} fill="#f59e0b" color="#f59e0b" /> {parcel.courierRating || 4.93}
                </span>
              </div>
              <div className="ptm-courier-veh">
                {parcel.courierVehicleNumber || 'MH 03 DN 1904'} · Express Courier
              </div>
            </div>
          </div>

          <div className="ptm-action-btns">
            <button
              className="ptm-btn ptm-btn-chat"
              onClick={() => setShowChat((v) => !v)}
            >
              <MessageSquare size={16} />
              <span>{showChat ? 'Close Chat' : 'Chat with Courier'}</span>
            </button>
            <a
              href={`tel:${parcel.courierPhone || '+919820154321'}`}
              className="ptm-btn ptm-btn-call"
            >
              <Phone size={15} />
              <span>Call</span>
            </a>
            <div className="ptm-fare-chip">
              <span className="ptm-fare-lbl">Total Fare</span>
              <span className="ptm-fare-val">₹{parcel.fare}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Real-Time In-App Chat Modal ── */}
      <AnimatePresence>
        {showChat && (
          <ChatBox
            rideId={parcel.id || parcel.trackingId}
            currentUserId="parcel-sender"
            currentUserName="Sender"
            currentUserRole="customer"
            partnerName={parcel.courierName || 'Vikram Joshi (Courier)'}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
