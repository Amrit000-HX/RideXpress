import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'
import { connectSocket, disconnectSocket, getSocket } from '../services/socketService'

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, token } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (isAuthenticated && token && token !== 'legacy') {
      const s = connectSocket(token)
      setSocket(s)

      const handleConnect = () => setIsConnected(true)
      const handleDisconnect = () => setIsConnected(false)

      s.on('connect', handleConnect)
      s.on('disconnect', handleDisconnect)

      if (s.connected) {
        setIsConnected(true)
      }

      return () => {
        s.off('connect', handleConnect)
        s.off('disconnect', handleDisconnect)
      }
    } else {
      disconnectSocket()
      setSocket(null)
      setIsConnected(false)
    }
  }, [isAuthenticated, token])

  return (
    <SocketContext.Provider value={{ socket: socket || getSocket(), isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
