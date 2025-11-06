"use client"

import { ClerkProvider } from '@clerk/nextjs'
import React from 'react'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/Toast'
import { ModalSystem } from '@/components/ui/ModalSystem'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { UIProvider } from '@/contexts/UIContext'
import { UserPreferencesProvider } from '@/contexts/UserPreferencesContext'
import { WebSocketProvider } from '@/contexts/WebSocketContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <UserPreferencesProvider>
            <UIProvider>
              <WebSocketProvider>
                <ToastProvider>
                  {children}
                  <ModalSystem />
                </ToastProvider>
              </WebSocketProvider>
            </UIProvider>
          </UserPreferencesProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </ClerkProvider>
  )
}

