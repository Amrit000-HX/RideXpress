/**
 * MapPicker.tsx
 * Interactive map for picking pickup + drop locations.
 * Stack: Leaflet.js · OpenStreetMap tiles · Browser Geolocation API
 *        Nominatim (reverse geocode + search) · OSRM (route distance)
 * 100% FREE — no API keys required.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Locate, Search, X, Navigation2, Loader } from 'lucide-react'
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
const pin = (color: string) =>
  L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="44" viewBox="0 0 30 44">
      <path fill="${color}" stroke="white" stroke-width="2.5"
        d="M15 1C7.3 1 1 7.3 1 15c0 11 14 27 14 27S29 26 29 15C29 7.3 22.7 1 15 1z"/>
      <circle fill="white" cx="15" cy="15" r="5.5"/>
    </svg>`,
    iconSize:   [30, 44],
    iconAnchor: [15, 44],
    popupAnchor:[0, -44],
  })

const pickupPin = pin('#6B9E72')  // sage green
const dropPin   = pin('#e74c3c')  // red

/* ─── Types ───────────────────────────────────────────────────── */
export interface LatLng    { lat: number; lng: number }
export interface LocationData { latLng: LatLng; address: string }

interface SearchResult { display_name: string; lat: string; lon: string }

interface MapPickerProps {
  vehiclePrice:     number
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
    if (target) map.flyTo([target.lat, target.lng], zoom, { duration: 1 })
  }, [target, zoom, map])
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
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function MapPicker({
  vehiclePrice,
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
        if (err.code === 1) setGpsError('Location permission denied. Please enable it in your browser settings.')
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

  /* ── Map click places drop pin ── */
  const handleMapClick = useCallback(
    (ll: LatLng) => {
      setDrop(ll)
      setFlyTarget(ll)
      setFlyZoom(PLACED_ZOOM)
      resolveAddr(ll, 'drop')
    },
    [resolveAddr]
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
    setSearchQuery(r.display_name.split(',').slice(0, 2).join(','))
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
    <div className="mp-wrap">

      {/* ── Controls bar ── */}
      <div className="mp-controls">

        {/* GPS button */}
        <button
          className={`mp-gps-btn ${gpsLoading ? 'mp-gps-loading' : ''}`}
          onClick={handleGps}
          disabled={gpsLoading}
          title="Use my current location as pickup"
        >
          {gpsLoading ? <Loader size={14} className="mp-spin" /> : <Locate size={14} />}
          {gpsLoading ? 'Locating…' : 'Use My Location'}
        </button>

        {/* Drop location search */}
        <div className="mp-search-wrap" ref={searchRef}>
          <div className="mp-search-row">
            <Search size={14} className="mp-search-icon" />
            <input
              className="mp-search-input"
              placeholder="Search drop location…"
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
            />
            {searchQuery && (
              <button
                className="mp-search-clear"
                onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggest(false) }}
              >
                <X size={12} />
              </button>
            )}
            {searchLoad && <Loader size={12} className="mp-spin mp-search-spin" />}
          </div>

          {/* Suggestions dropdown */}
          {showSuggest && suggestions.length > 0 && (
            <ul className="mp-suggest-list">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className="mp-suggest-item"
                  onMouseDown={() => handleSuggestionClick(s)}
                >
                  <Navigation2 size={11} className="mp-suggest-icon" />
                  <span>{s.display_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── GPS error ── */}
      {gpsError && (
        <div className="mp-gps-error">
          ⚠ {gpsError}
        </div>
      )}

      {/* ── Map ── */}
      <div className="mp-map-container">
        <MapContainer
          center={[INDIA_CENTER.lat, INDIA_CENTER.lng]}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FlyTo target={flyTarget} zoom={flyZoom} />
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
              pathOptions={{ color: '#6B9E72', weight: 2.5, dashArray: '6 6', opacity: 0.8 }}
            />
          )}
        </MapContainer>

        {/* Map legend overlay */}
        <div className="mp-legend">
          <span className="mp-legend-item"><span className="mp-dot mp-dot-green" /> Pickup</span>
          <span className="mp-legend-item"><span className="mp-dot mp-dot-red" /> Drop</span>
        </div>

        {/* Instruction overlay (shown until both pins placed) */}
        {!pickup && !drop && (
          <div className="mp-hint-overlay">
            <p>📍 Click "Use My Location" for pickup<br />then tap map to place your drop</p>
          </div>
        )}
        {pickup && !drop && (
          <div className="mp-hint-overlay mp-hint-small">
            <p>🔴 Now tap map or search to set drop location</p>
          </div>
        )}
      </div>

      {/* ── Address cards ── */}
      <div className="mp-addr-cards">
        <div className="mp-addr-card mp-addr-pickup">
          <span className="mp-addr-dot mp-dot-green" />
          <div className="mp-addr-text">
            <span className="mp-addr-label">Pickup</span>
            <span className="mp-addr-value">
              {pickupAddr || (gpsLoading ? 'Detecting…' : 'Not set — use GPS or drag pin')}
            </span>
          </div>
        </div>
        <div className="mp-addr-card mp-addr-drop">
          <span className="mp-addr-dot mp-dot-red" />
          <div className="mp-addr-text">
            <span className="mp-addr-label">Drop</span>
            <span className="mp-addr-value">
              {dropAddr || 'Not set — search or tap map'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Live fare estimate ── */}
      {distance !== null && fare !== null && (
        <div className="mp-fare-strip">
          <span className="mp-fare-dist">📏 {distance} km</span>
          <span className="mp-fare-sep">·</span>
          <span className="mp-fare-amount">Est. ₹{fare.toLocaleString('en-IN')}</span>
          <span className="mp-fare-note">Fare updates as you move pins</span>
        </div>
      )}
    </div>
  )
}
