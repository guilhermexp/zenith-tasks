'use client';

import React, { createContext, useContext, ReactNode } from 'react';

import { useWebSocket, WebSocketMessage } from '@/hooks/useWebSocket';

interface WebSocketContextType {
  isConnected: boolean;
  send: (message: WebSocketMessage) => void;
  close: () => void;
  reconnect: () => void;
  lastMessage: WebSocketMessage | null;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
  url?: string;
  enabled?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3457/ws',
  enabled = false, // Disabled by default, enable when needed
  onMessage,
}) => {
  const websocket = useWebSocket({
    url,
    enabled,
    reconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    onOpen: () => {
      console.log('[WebSocket] Connection established');
    },
    onClose: () => {
      console.log('[WebSocket] Connection closed');
    },
    onError: (error) => {
      console.error('[WebSocket] Error:', error);
    },
    onMessage: (message) => {
      console.log('[WebSocket] Message received:', message);
      onMessage?.(message);
    },
  });

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketProvider;
