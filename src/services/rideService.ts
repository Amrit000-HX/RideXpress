import api from './api'

export interface CreateRidePayload {
  vehicleType: string
  vehicleId?: string
  pickup: {
    address: string
    lat: number
    lng: number
  }
  drop: {
    address: string
    lat: number
    lng: number
  }
  distanceKm: number
  estimatedMinutes?: number
  estimatedFare: number
  paymentMethod?: string
  notes?: string
}

export interface FareBreakdown {
  baseFare: number
  distanceFare: number
  serviceFee: number
  taxAmount: number
  totalFare: number
}

export interface RideDriverInfo {
  id: string | null
  name: string
  phone: string
  vehicleNumber: string
  vehicleType?: string
  rating: number
  etaMinutes?: number | null
  distanceKm?: number | null
}

export interface RideCustomerInfo {
  id: string
  name: string
  email?: string
  phone?: string
}

export interface RideResponse {
  id: string
  bookingId: string
  customer?: RideCustomerInfo
  vehicleType: string
  pickup: { address: string; lat: number; lng: number }
  drop: { address: string; lat: number; lng: number }
  distanceKm: number
  estimatedMinutes?: number
  estimatedFare: number
  actualFare?: number
  fareBreakdown?: FareBreakdown
  paymentMethod?: string
  paymentStatus?: string
  startRidePin: string
  notes?: string
  driver: RideDriverInfo | null
  status: string
  bookedAt: string
  acceptedAt?: string | null
  arrivedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
  cancelledBy?: string | null
  cancellationReason?: string
}

export interface DriverEarnings {
  count: number
  totalEarnings: number
  todayEarnings: number
  weekEarnings: number
  totalRides: number
  completedRides: number
  cancelledRides: number
  rides: any[]
}

/**
 * Creates a new ride and triggers server-side proximity driver matching.
 */
export async function createRideBooking(payload: CreateRidePayload): Promise<{ success: boolean; ride: RideResponse }> {
  const res = await api.post<{ success: boolean; message: string; ride: RideResponse }>('/rides', payload)
  return { success: res.data.success, ride: res.data.ride }
}

/**
 * Fetch a single ride by Mongo _id or bookingId.
 */
export async function getRideById(id: string) {
  const res = await api.get<{ success: boolean; ride: any }>(`/rides/${id}`)
  return res.data.ride
}

/**
 * Fetch customer's own ride history.
 */
export async function getMyRides() {
  const res = await api.get<{ success: boolean; count: number; rides: any[] }>('/rides/my-rides')
  return res.data
}

/**
 * Fetch customer's current active ride (if any).
 */
export async function getActiveRide(): Promise<any | null> {
  const res = await api.get<{ success: boolean; ride: any | null }>('/rides/active')
  return res.data.ride
}

/**
 * Driver accepts an incoming ride.
 */
export async function acceptRideBooking(rideId: string) {
  const res = await api.post(`/rides/${rideId}/accept`)
  return res.data
}

/**
 * Driver rejects an incoming ride request.
 */
export async function rejectRideBooking(rideId: string) {
  const res = await api.post(`/rides/${rideId}/reject`)
  return res.data
}

/**
 * User or driver cancels a ride.
 */
export async function cancelRideBooking(rideId: string, reason?: string) {
  const res = await api.post(`/rides/${rideId}/cancel`, { reason: reason || '' })
  return res.data
}

/**
 * Driver marks arrival at pickup location.
 */
export async function markDriverArrived(rideId: string) {
  const res = await api.post(`/rides/${rideId}/arrived`)
  return res.data
}

/**
 * Driver starts the ride (with optional PIN verification).
 */
export async function startRideBooking(rideId: string, pin?: string) {
  const res = await api.post(`/rides/${rideId}/start`, { pin })
  return res.data
}

/**
 * Driver completes an active trip.
 */
export async function completeRideBooking(rideId: string) {
  const res = await api.post(`/rides/${rideId}/complete`)
  return res.data
}

/**
 * Fetch past rides & shift earnings for logged-in driver.
 */
export async function getDriverRideHistory(): Promise<DriverEarnings> {
  const res = await api.get<DriverEarnings & { success: boolean }>('/rides/driver-history')
  return res.data
}

/**
 * Fetch driver's currently active ride (if any).
 */
export async function getDriverActiveRide(): Promise<any | null> {
  const res = await api.get<{ success: boolean; ride: any | null }>('/rides/driver-active')
  return res.data.ride
}

/**
 * Admin: Fetch all rides with optional status filter.
 */
export async function getAllRides(status?: string, page = 1, limit = 50) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) params.set('status', status)
  const res = await api.get<{ success: boolean; total: number; rides: any[] }>(`/rides/all?${params}`)
  return res.data
}

/**
 * Fetch open available ride requests for drivers.
 */
export async function getAvailableRides(): Promise<any[]> {
  const res = await api.get<{ success: boolean; rides: any[] }>('/rides/available')
  return res.data.rides || []
}

/**
 * Persist driver online/offline status to the database.
 * This ensures the status survives page refreshes.
 */
export async function setDriverOnlineStatus(status: 'ONLINE' | 'OFFLINE'): Promise<{ onlineStatus: string }> {
  const res = await api.patch<{ success: boolean; onlineStatus: string }>('/employees/me/status', { status })
  return res.data
}

/**
 * Fetch the driver's current persisted online status and location from the database.
 */
export async function getDriverOnlineStatus(): Promise<{
  onlineStatus: string
  availabilityStatus: string
  currentLocation?: { lat: number; lng: number; heading?: number; speed?: number }
  location?: { type: string; coordinates: [number, number] }
  vehicleCategory?: string
  name?: string
}> {
  const res = await api.get('/employees/me/status')
  return res.data
}

/**
 * Push driver GPS coordinates to the database via REST.
 * This is the fallback path when the socket connection is unreliable.
 * The primary path is the socket 'driver:location_update' event (every 5s).
 * This REST call fires every ~10s (every 2nd socket tick).
 *
 * GeoJSON note: backend stores as [lng, lat] — this function sends lat/lng separately.
 */
export async function updateDriverLocation(
  lat: number,
  lng: number,
  heading = 0,
  speed   = 0,
): Promise<{ success: boolean }> {
  const res = await api.patch<{ success: boolean }>('/employees/me/location', { lat, lng, heading, speed })
  return res.data
}
