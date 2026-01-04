/**
 * React hook for WebSocket connections
 */
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface UseWebSocketOptions {
  url: string
  onMessage?: (data: any) => void
  onError?: (error: Event) => void
  onOpen?: () => void
  onClose?: () => void
  reconnect?: boolean
  reconnectInterval?: number
}

export function useWebSocket(options: UseWebSocketOptions) {
  const { url, onMessage, onError, onOpen, onClose, reconnect = true, reconnectInterval = 3000 } = options
  const { token } = useAuth()
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null)
  const [readyState, setReadyState] = useState<number>(WebSocket.CLOSED)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!token) {
      return
    }

    const connect = () => {
      try {
        // Build WebSocket URL
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsHost = import.meta.env.VITE_WS_HOST || window.location.host
        const wsUrl = `${wsProtocol}//${wsHost}${url}`
        
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => {
          setReadyState(WebSocket.OPEN)
          onOpen?.()
        }

        ws.onmessage = (event) => {
          setLastMessage(event)
          onMessage?.(JSON.parse(event.data))
        }

        ws.onerror = (error) => {
          onError?.(error)
        }

        ws.onclose = () => {
          setReadyState(WebSocket.CLOSED)
          onClose?.()
          
          // Attempt to reconnect
          if (reconnect && token) {
            reconnectTimeoutRef.current = window.setTimeout(() => {
              connect()
            }, reconnectInterval)
          }
        }

        setReadyState(ws.readyState)
      } catch (error) {
        console.error('WebSocket connection error:', error)
      }
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [url, token, reconnect, reconnectInterval, onMessage, onError, onOpen, onClose])

  const sendMessage = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }

  return {
    lastMessage,
    readyState,
    sendMessage,
  }
}


