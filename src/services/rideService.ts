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
}

export interface RideResponse {
  id: string
  bookingId: string
  vehicleType: string
  pickup: { address: string; lat: number; lng: number }
  drop: { address: string; lat: number; lng: number }
  distanceKm: number
  estimatedFare: number
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
