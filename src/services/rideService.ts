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
  estimatedFare: number
  paymentMethod?: string
}

export interface FareBreakdown {
  baseFare: number
  distanceFare: number
  serviceFee: number
  taxAmount: number
  totalFare: number
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
  estimatedFare: number
  actualFare?: number
  fareBreakdown?: FareBreakdown
  paymentMethod?: string
  paymentStatus?: string
  startRidePin: string
  driver: {
    id: string
    name: string
    phone: string
    vehicleNumber: string
    rating: number
    etaMinutes: number
    distanceKm: number
  }
  status: string
  bookedAt: string
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
 * Driver accepts an incoming ride.
 */
export async function acceptRideBooking(rideId: string) {
  const res = await api.post(`/rides/${rideId}/accept`)
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
export async function getDriverRideHistory() {
  const res = await api.get<{ success: boolean; count: number; totalEarnings: number; rides: any[] }>('/rides/driver-history')
  return res.data
}
