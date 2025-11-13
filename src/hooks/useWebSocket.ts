'use client';

import { useEffect, useRef, useState, useCallback } from 'react'
import { logger } from '@/utils/logger'

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

interface UseWebSocketOptions {
  url: string;
  enabled?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  send: (message: WebSocketMessage) => void;
  close: () => void;
  reconnect: () => void;
  lastMessage: WebSocketMessage | null;
}

export const useWebSocket = ({
  url,
  enabled = true,
  reconnect = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  onOpen,
  onClose,
  onError,
  onMessage,
}: UseWebSocketOptions): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url)

      ws.onopen = (event) => {
        logger.info('[WebSocket] Connected')
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
        onOpen?.(event)
      }

      ws.onclose = (event) => {
        logger.warn('[WebSocket] Disconnected')
        setIsConnected(false)
        wsRef.current = null
        onClose?.(event)

        // Attempt to reconnect
        if (
          reconnect &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current += 1
          logger.warn(
            `[WebSocket] Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          )
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }

      ws.onerror = (event) => {
        logger.error('[WebSocket] Error:', event as any)
        onError?.(event)
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)
          onMessage?.(message)
        } catch (error) {
          logger.error('[WebSocket] Failed to parse message:', error as any)
        }
      }

      wsRef.current = ws
    } catch (error) {
      logger.error('[WebSocket] Connection failed:', error as any)
    }
  }, [url, enabled, reconnect, reconnectInterval, maxReconnectAttempts, onOpen, onClose, onError, onMessage]);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      logger.warn('[WebSocket] Cannot send message, not connected')
    }
  }, []);

  const close = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    wsRef.current?.close()
    wsRef.current = null
    setIsConnected(false)
  }, []);

  const manualReconnect = useCallback(() => {
    close()
    reconnectAttemptsRef.current = 0
    connect()
  }, [close, connect]);

  // Connect on mount or when enabled changes
  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      close()
    }
  }, [enabled, connect, close])

  return {
    isConnected,
    send,
    close,
    reconnect: manualReconnect,
    lastMessage,
  };
};

export default useWebSocket;
