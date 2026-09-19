import { useState, useEffect, useRef, useCallback } from 'react'
import { useSocket } from '../contexts/SocketContext'

export interface DriverPosition {
  driverId: string
  lat: number
  lng: number
  heading: number
  speed?: number
  timestamp?: number
}

export interface NearbyDriver {
  id: string
  vehicleType?: string
  lat: number
  lng: number
  heading?: number
  isAvailable?: boolean
}

/**
 * useLiveDriverTracking — Real-time driver GPS tracking & nearby fleet hook
 *
 * Subscribes to live Socket.IO events for active ride rooms and nearby fleet markers.
 * Performs smooth interpolation between GPS pings.
 */
export function useLiveDriverTracking(activeRideId?: string | null) {
  const { socket, isConnected } = useSocket()
  const [driverPosition, setDriverPosition] = useState<DriverPosition | null>(null)
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([])
  const animationFrameRef = useRef<number | null>(null)

  // Target coordinates for linear interpolation (lerp)
  const targetPosRef = useRef<{ lat: number; lng: number } | null>(null)
  const currentPosRef = useRef<{ lat: number; lng: number } | null>(null)

  // ── Join / Leave Ride Room ──────────────────────────────────────────
  const joinRideRoom = useCallback((rideId: string) => {
    if (socket && isConnected && rideId) {
      socket.emit('ride:join_room', { rideId })
    }
  }, [socket, isConnected])

  const leaveRideRoom = useCallback((rideId: string) => {
    if (socket && isConnected && rideId) {
      socket.emit('ride:leave_room', { rideId })
    }
  }, [socket, isConnected])

  // ── Auto-join room when activeRideId is provided ─────────────────────
  useEffect(() => {
    if (!socket || !isConnected || !activeRideId) return

    socket.emit('ride:join_room', { rideId: activeRideId })

    const handlePositionUpdate = (pos: DriverPosition) => {
      targetPosRef.current = { lat: pos.lat, lng: pos.lng }
      if (!currentPosRef.current) {
        currentPosRef.current = { lat: pos.lat, lng: pos.lng }
      }
      setDriverPosition(pos)
    }

    socket.on('driver:position', handlePositionUpdate)

    return () => {
      socket.off('driver:position', handlePositionUpdate)
      socket.emit('ride:leave_room', { rideId: activeRideId })
    }
  }, [socket, isConnected, activeRideId])

  // ── Smooth coordinate interpolation loop (60 FPS) ────────────────────
  useEffect(() => {
    const interpolate = () => {
      if (currentPosRef.current && targetPosRef.current) {
        const dLat = targetPosRef.current.lat - currentPosRef.current.lat
        const dLng = targetPosRef.current.lng - currentPosRef.current.lng

        // Lerp factor (0.08 = smooth glide towards target)
        if (Math.abs(dLat) > 0.000001 || Math.abs(dLng) > 0.000001) {
          currentPosRef.current = {
            lat: currentPosRef.current.lat + dLat * 0.08,
            lng: currentPosRef.current.lng + dLng * 0.08,
          }
          setDriverPosition((prev) =>
            prev
              ? {
                  ...prev,
                  lat: currentPosRef.current!.lat,
                  lng: currentPosRef.current!.lng,
                }
              : null
          )
        }
      }
      animationFrameRef.current = requestAnimationFrame(interpolate)
    }

    animationFrameRef.current = requestAnimationFrame(interpolate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // ── Listen for nearby fleet updates ──────────────────────────────────
  useEffect(() => {
    if (!socket || !isConnected) return

    // Request active fleet on connect
    socket.emit('fleet:get_nearby')

    const handleNearbyList = (data: { drivers: NearbyDriver[] }) => {
      if (data?.drivers) {
        setNearbyDrivers(data.drivers)
      }
    }

    const handleSingleDriverUpdate = (driver: NearbyDriver) => {
      setNearbyDrivers((prev) => {
        const existingIdx = prev.findIndex((d) => d.id === driver.id)
        if (existingIdx >= 0) {
          const updated = [...prev]
          updated[existingIdx] = driver
          return updated
        }
        return [...prev, driver]
      })
    }

    socket.on('fleet:nearby_drivers', handleNearbyList)
    socket.on('fleet:driver_location', handleSingleDriverUpdate)

    // Periodic fleet refresh every 15s
    const interval = setInterval(() => {
      socket.emit('fleet:get_nearby')
    }, 15000)

    return () => {
      socket.off('fleet:nearby_drivers', handleNearbyList)
      socket.off('fleet:driver_location', handleSingleDriverUpdate)
      clearInterval(interval)
    }
  }, [socket, isConnected])

  return {
    driverPosition,
    nearbyDrivers,
    joinRideRoom,
    leaveRideRoom,
    isConnected,
  }
}
