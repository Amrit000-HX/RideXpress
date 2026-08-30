/**
 * MapPicker.tsx
 * Full-Window Interactive Map for Ride Location Selection.
 * Stack: Leaflet.js · OpenStreetMap tiles · Browser Geolocation API
 *        Nominatim (reverse geocode + search) · OSRM (route distance)
 * 100% FREE — no API keys required.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Locate, Search, X, Navigation2, Loader,
  ArrowLeft, Navigation, Shield,
} from 'lucide-react'
import './MapPicker.css'

/* ─── Fix default Leaflet marker icon (broken by Vite bundler) ── */
import markerUrl       from 'leaflet/dist/images/marker-icon.png'
import markerRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl:       markerUrl,
  iconRetinaUrl: markerRetinaUrl,
  shadowUrl:     markerShadowUrl,
})

/* ─── Custom SVG pins ─────────────────────────────────────────── */
const pin = (color: string, label: string) =>
  L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
      <div style="background:${color};color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;margin-bottom:2px;box-shadow:0 2px 6px rgba(0,0,0,0.3);letter-spacing:0.5px;">${label}</div>
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
        <path fill="${color}" stroke="#ffffff" stroke-width="2"
          d="M15 1C7.3 1 1 7.3 1 15c0 10 14 26 14 26S29 25 29 15C29 7.3 22.7 1 15 1z"/>
        <circle fill="#ffffff" cx="15" cy="15" r="5"/>
      </svg>
    </div>`,
    iconSize:   [30, 42],
    iconAnchor: [15, 42],
    popupAnchor:[0, -42],
  })

const pickupPin = pin('#6B9E72', 'PICKUP')  // sage green
const dropPin   = pin('#e74c3c', 'DROP')    // red

/* ─── Types ───────────────────────────────────────────────────── */
export interface LatLng       { lat: number; lng: number }
export interface LocationData { latLng: LatLng; address: string }

interface SearchResult { display_name: string; lat: string; lon: string }

interface MapPickerProps {
  vehicleType:      string
  vehiclePrice:     number
  vehiclePriceUnit: string
  vehicleEta:       string
  onClose:          () => void
  onConfirm:        () => void
  onPickupChange:   (loc: LocationData) => void
  onDropChange:     (loc: LocationData) => void
  onDistanceChange: (km: number, fare: number) => void
}

/* ─── Default map centre (India) ──────────────────────────────── */
const INDIA_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 }
const DEFAULT_ZOOM          = 5
const PLACED_ZOOM           = 15

/* ─── Nominatim reverse geocode ──────────────────────────────── */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'RideXpress/1.0' } }
    )
    const d = await r.json()
    return d.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

/* ─── Nominatim forward search ───────────────────────────────── */
async function searchPlaces(query: string): Promise<SearchResult[]> {
  if (query.length < 3) return []
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'RideXpress/1.0' } }
    )
    return await r.json()
  } catch {
    return []
  }
}

/* ─── OSRM route distance ─────────────────────────────────────── */
async function getRouteDistance(from: LatLng, to: LatLng): Promise<number> {
  try {
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
    )
    const d = await r.json()
    const meters: number = d?.routes?.[0]?.distance ?? 0
    return Math.max(1, Math.round(meters / 100) / 10) // round to 1 decimal km
  } catch {
    // Fallback: Haversine straight-line distance
    const R = 6371
    const dLat = ((to.lat - from.lat) * Math.PI) / 180
    const dLng = ((to.lng - from.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((from.lat * Math.PI) / 180) *
        Math.cos((to.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2
    return Math.max(1, Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10)
  }
}

/* ─── Inner helper: fly map to coords ────────────────────────── */
function FlyTo({ target, zoom }: { target: LatLng | null; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], zoom, { duration: 1.2 })
    }
  }, [target, zoom, map])
  return null
}

/* ─── Inner helper: auto-fit bounds when both pins exist ─────── */
function FitBounds({ pickup, drop }: { pickup: LatLng | null; drop: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (pickup && drop) {
      const bounds = L.latLngBounds([
        [pickup.lat, pickup.lng],
        [drop.lat, drop.lng],
      ])
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 16 })
    }
  }, [pickup, drop, map])
  return null
}

/* ─── Inner helper: click-to-place drop pin ──────────────────── */
function MapClickHandler({ onMapClick }: { onMapClick: (ll: LatLng) => void }) {
  useMapEvents({
    click(e) { onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }) },
  })
  return null
}

/* ═══════════════════════════════════════════════════════════════
   MAIN FULL-WINDOW MAP COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function MapPicker({
  vehicleType,
  vehiclePrice,
  vehiclePriceUnit,
  vehicleEta,
  onClose,
  onConfirm,
  onPickupChange,
  onDropChange,
  onDistanceChange,
}: MapPickerProps) {
  const [pickup,      setPickup]      = useState<LatLng | null>(null)
  const [drop,        setDrop]        = useState<LatLng | null>(null)
  const [pickupAddr,  setPickupAddr]  = useState('')
  const [dropAddr,    setDropAddr]    = useState('')
  const [flyTarget,   setFlyTarget]   = useState<LatLng | null>(null)
  const [flyZoom,     setFlyZoom]     = useState(DEFAULT_ZOOM)
  const [gpsLoading,  setGpsLoading]  = useState(false)
  const [gpsError,    setGpsError]    = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [searchLoad,  setSearchLoad]  = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)
  const [distance,    setDistance]    = useState<number | null>(null)
  const [fare,        setFare]        = useState<number | null>(null)

  const searchRef   = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Reverse geocode helper ── */
  const resolveAddr = useCallback(
    async (latlng: LatLng, type: 'pickup' | 'drop') => {
      const addr = await reverseGeocode(latlng.lat, latlng.lng)
      if (type === 'pickup') {
        setPickupAddr(addr)
        onPickupChange({ latLng: latlng, address: addr })
      } else {
        setDropAddr(addr)
        onDropChange({ latLng: latlng, address: addr })
      }
    },
    [onPickupChange, onDropChange]
  )

  /* ── Route distance whenever both pins set ── */
  useEffect(() => {
    if (!pickup || !drop) return
    getRouteDistance(pickup, drop).then(km => {
      const f = Math.round(km * vehiclePrice)
      setDistance(km)
      setFare(f)
      onDistanceChange(km, f)
    })
  }, [pickup, drop, vehiclePrice, onDistanceChange])

  /* ── GPS: use my location ── */
  const handleGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.')
      return
    }
    setGpsLoading(true)
    setGpsError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const ll = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setPickup(ll)
        setFlyTarget(ll)
        setFlyZoom(PLACED_ZOOM)
        setGpsLoading(false)
        resolveAddr(ll, 'pickup')
      },
      err => {
        setGpsLoading(false)
        if (err.code === 1) setGpsError('Location permission denied. Please allow location access in your browser.')
        else setGpsError('Could not get your location. Try again or tap the map.')
      },
      { timeout: 10000, maximumAge: 60000 }
    )
  }

  /* ── Pickup marker drag ── */
  const handlePickupDrag = useCallback(
    (e: L.DragEndEvent) => {
      const ll: LatLng = { lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng }
      setPickup(ll)
      resolveAddr(ll, 'pickup')
    },
    [resolveAddr]
  )

  /* ── Drop marker drag ── */
  const handleDropDrag = useCallback(
    (e: L.DragEndEvent) => {
      const ll: LatLng = { lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng }
      setDrop(ll)
      resolveAddr(ll, 'drop')
    },
    [resolveAddr]
  )

  /* ── Map click places drop pin (or pickup if not set yet) ── */
  const handleMapClick = useCallback(
    (ll: LatLng) => {
      if (!pickup) {
        setPickup(ll)
        setFlyTarget(ll)
        setFlyZoom(PLACED_ZOOM)
        resolveAddr(ll, 'pickup')
      } else {
        setDrop(ll)
        setFlyTarget(ll)
        setFlyZoom(PLACED_ZOOM)
        resolveAddr(ll, 'drop')
      }
    },
    [pickup, resolveAddr]
  )

  /* ── Search with debounce ── */
  const handleSearchInput = (val: string) => {
    setSearchQuery(val)
    setShowSuggest(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length < 3) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearchLoad(true)
      const results = await searchPlaces(val)
      setSuggestions(results)
      setSearchLoad(false)
    }, 400)
  }

  /* ── Pick suggestion ── */
  const handleSuggestionClick = (r: SearchResult) => {
    const ll: LatLng = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) }
    setDrop(ll)
    setFlyTarget(ll)
    setFlyZoom(PLACED_ZOOM)
    setSearchQuery(r.display_name.split(',').slice(0, 3).join(','))
    setShowSuggest(false)
    setSuggestions([])
    resolveAddr(ll, 'drop')
  }

  /* ── Close suggestions on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggest(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const polyLine: [number, number][] =
    pickup && drop ? [[pickup.lat, pickup.lng], [drop.lat, drop.lng]] : []

  return (
    <div className="mp-fullscreen">

      {/* ── 1. FULL-WINDOW MAP CANVAS ── */}
      <div className="mp-map-canvas">
        <MapContainer
          center={[INDIA_CENTER.lat, INDIA_CENTER.lng]}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FlyTo target={flyTarget} zoom={flyZoom} />
          <FitBounds pickup={pickup} drop={drop} />
          <MapClickHandler onMapClick={handleMapClick} />

          {/* Pickup pin — draggable green */}
          {pickup && (
            <Marker
              position={[pickup.lat, pickup.lng]}
              icon={pickupPin}
              draggable
              eventHandlers={{ dragend: handlePickupDrag }}
            />
          )}

          {/* Drop pin — draggable red */}
          {drop && (
            <Marker
              position={[drop.lat, drop.lng]}
              icon={dropPin}
              draggable
              eventHandlers={{ dragend: handleDropDrag }}
            />
          )}

          {/* Dotted route line */}
          {polyLine.length === 2 && (
            <Polyline
              positions={polyLine}
              pathOptions={{ color: '#1A1A1A', weight: 4, dashArray: '8 8', opacity: 0.85 }}
            />
          )}
        </MapContainer>
      </div>

      {/* ── 2. TOP FLOATING CONTROL BAR ── */}
      <header className="mp-topbar">
        {/* Back / Close button */}
        <button className="mp-back-btn" onClick={onClose} aria-label="Close Map">
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        {/* Selected Vehicle Badge */}
        <div className="mp-vehicle-pill">
          <span className="mp-vehicle-name">{vehicleType}</span>
          <span className="mp-vehicle-sep">·</span>
          <span className="mp-vehicle-rate">₹{vehiclePrice.toLocaleString('en-IN')}{vehiclePriceUnit}</span>
          <span className="mp-vehicle-eta">({vehicleEta})</span>
        </div>

        {/* Search Drop Destination */}
        <div className="mp-search-container" ref={searchRef}>
          <div className="mp-search-box">
            <Search size={16} className="mp-search-icon" />
            <input
              className="mp-search-field"
              placeholder="Search destination / drop location…"
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
            />
            {searchQuery && (
              <button
                className="mp-clear-btn"
                onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggest(false) }}
              >
                <X size={14} />
              </button>
            )}
            {searchLoad && <Loader size={14} className="mp-spin mp-search-spin" />}
          </div>

          {/* Search suggestions dropdown */}
          {showSuggest && suggestions.length > 0 && (
            <ul className="mp-dropdown-list">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className="mp-dropdown-item"
                  onMouseDown={() => handleSuggestionClick(s)}
                >
                  <Navigation2 size={13} className="mp-dropdown-icon" />
                  <span>{s.display_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Use My Location (GPS) Button */}
        <button
          className={`mp-gps-action-btn ${gpsLoading ? 'mp-gps-active' : ''}`}
          onClick={handleGps}
          disabled={gpsLoading}
          title="Detect and use my current location as pickup point"
        >
          {gpsLoading ? <Loader size={15} className="mp-spin" /> : <Locate size={15} />}
          <span>{gpsLoading ? 'Locating…' : 'Use My Location'}</span>
        </button>
      </header>

      {/* ── 3. GPS ERROR BANNER (if any) ── */}
      {gpsError && (
        <div className="mp-error-banner">
          ⚠ {gpsError}
        </div>
      )}

      {/* ── 4. FLOATING HINT OVERLAY ── */}
      {!pickup && !drop && (
        <div className="mp-floating-hint">
          <p>
            📍 Click <strong>"Use My Location"</strong> for pickup, then <strong>tap the map</strong> to set your drop point.
          </p>
        </div>
      )}
      {pickup && !drop && (
        <div className="mp-floating-hint mp-hint-pulse">
          <p>
            🔴 Now <strong>tap anywhere on the map</strong> or use the search bar above to set your destination.
          </p>
        </div>
      )}

      {/* ── 5. MAP LEGEND ── */}
      <div className="mp-map-legend">
        <span className="mp-legend-tag"><span className="mp-tag-dot mp-dot-green" /> 🟢 Pickup (Drag pin)</span>
        <span className="mp-legend-tag"><span className="mp-tag-dot mp-dot-red" /> 🔴 Drop (Drag pin)</span>
      </div>

      {/* ── 6. BOTTOM FLOATING BOOKING CARD ── */}
      <footer className="mp-bottom-card">
        <div className="mp-card-grid">

          {/* Locations Summary */}
          <div className="mp-locations-block">
            {/* Pickup */}
            <div className="mp-loc-item">
              <span className="mp-pin-icon mp-pin-green" />
              <div className="mp-loc-info">
                <span className="mp-loc-title">Pickup Location</span>
                <span className="mp-loc-addr" title={pickupAddr}>
                  {pickupAddr || (gpsLoading ? 'Detecting current GPS location…' : 'Not selected — tap GPS or map')}
                </span>
              </div>
            </div>

            <div className="mp-loc-divider" />

            {/* Drop */}
            <div className="mp-loc-item">
              <span className="mp-pin-icon mp-pin-red" />
              <div className="mp-loc-info">
                <span className="mp-loc-title">Drop Destination</span>
                <span className="mp-loc-addr" title={dropAddr}>
                  {dropAddr || 'Not selected — search above or tap map'}
                </span>
              </div>
            </div>
          </div>

          {/* Route & Fare Calculation */}
          <div className="mp-fare-block">
            <div className="mp-fare-details">
              <div className="mp-fare-label">
                {distance !== null ? `Trip Distance: ${distance} km` : 'Estimated Distance'}
              </div>
              <div className="mp-fare-amount">
                {fare !== null ? (
                  `₹${fare.toLocaleString('en-IN')}`
                ) : (
                  `₹${(vehiclePrice * 3).toLocaleString('en-IN')} – ₹${(vehiclePrice * 7).toLocaleString('en-IN')}`
                )}
              </div>
              <div className="mp-fare-note">
                <Shield size={12} /> Standard Fare · Live Calculated
              </div>
            </div>

            {/* Confirm Button */}
            <button
              className="mp-confirm-btn"
              disabled={!pickup || !drop}
              onClick={onConfirm}
            >
              <Navigation size={18} />
              <span>Confirm {vehicleType}</span>
            </button>
          </div>

        </div>
      </footer>

    </div>
  )
}
