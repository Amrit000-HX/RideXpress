import { io, Socket } from 'socket.io-client'

/**
 * socketService.ts — Singleton Socket.IO client manager
 *
 * Manages persistent WebSocket connection to the backend server with JWT authentication.
 */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let socket: Socket | null = null

/**
 * Connect to the Socket.IO server with JWT authentication token.
 */
export function connectSocket(token: string): Socket {
  if (socket && socket.connected) {
    return socket
  }

  // If socket exists but disconnected, update token and reconnect
  if (socket) {
    socket.auth = { token }
    socket.connect()
    return socket
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => {
    console.log('⚡ [Socket.IO] Connected to backend | SocketID:', socket?.id)
  })

  socket.on('disconnect', (reason) => {
    console.log('🔌 [Socket.IO] Disconnected | Reason:', reason)
  })

  socket.on('connect_error', (err) => {
    console.warn('⚠️ [Socket.IO] Connection Error:', err.message)
  })

  return socket
}

/**
 * Get current active socket instance.
 */
export function getSocket(): Socket | null {
  return socket
}

/**
 * Disconnect socket on user logout.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    console.log('🔌 [Socket.IO] Connection closed cleanly.')
  }
}
