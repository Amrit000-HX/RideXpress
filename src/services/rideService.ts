import api from './api'

export interface LocationPoint {
  address: string
  lat: number
  lng: number
}

export interface RideBookingPayload {
  vehicleType:   string
  vehicleId:     string
  pickup:        LocationPoint
  drop:          LocationPoint
  distanceKm:    number
  estimatedFare: number
}

export interface RideBookingResponse {
  id:            string
  bookingRef:    string
  vehicleType:   string
  pickup:        LocationPoint
  drop:          LocationPoint
  distanceKm:    number
  estimatedFare: number
  status:        string
  bookedAt:      string
}

/** POST /api/rides — Book a new ride */
export const createRide = async (payload: RideBookingPayload): Promise<RideBookingResponse> => {
  const res = await api.post('/rides', payload)
  return res.data.ride as RideBookingResponse
}

/** GET /api/rides/my-rides — Customer's ride history */
export const getMyRides = async (): Promise<RideBookingResponse[]> => {
  const res = await api.get('/rides/my-rides')
  return res.data.rides as RideBookingResponse[]
}
