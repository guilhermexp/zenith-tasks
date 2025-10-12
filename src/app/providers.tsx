"use client"

import { ClerkProvider } from '@clerk/nextjs'
import React from 'react'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastProvider } from '@/components/Toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ErrorBoundary>
        <ToastProvider>
          {children}
        </ToastProvider>
      </ErrorBoundary>
    </ClerkProvider>
  )
}

