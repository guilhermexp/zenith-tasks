"use client"

import React, { useState, useRef, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { SparklesIcon } from '../Icons'

interface AIInputProps {
  onSubmit: (message: string) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
}

export function AIInput({ 
  onSubmit, 
  isLoading = false,
  placeholder = "Pergunte algo...",
  className 
}: AIInputProps) {
  const [message, setMessage] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSubmit(message.trim())
      setMessage('')
      setIsExpanded(false)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const handleFocus = () => {
    setIsExpanded(true)
  }

  const handleBlur = () => {
    if (!message.trim()) {
      setIsExpanded(false)
    }
  }

  return (
    <div className={cn(
      "relative transition-all duration-300",
      isExpanded ? "w-full" : "w-auto",
      className
    )}>
      {!isExpanded ? (
        <button
          onClick={() => {
            setIsExpanded(true)
            setTimeout(() => textareaRef.current?.focus(), 100)
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900/80 hover:bg-neutral-800/90 border border-neutral-700/50 rounded-full text-sm font-medium text-neutral-200 transition-all hover:scale-105 shadow-lg backdrop-blur-sm"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-md opacity-60 animate-pulse bg-neutral-400/20"></div>
            <SparklesIcon className="w-4 h-4 text-neutral-200 relative z-10" />
          </div>
          <span>Perguntar à IA</span>
        </button>
      ) : (
        <div className="relative bg-neutral-950/80 border border-neutral-800/60 rounded-2xl p-3 shadow-2xl backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-md opacity-60 animate-pulse bg-neutral-400/20"></div>
                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center relative border border-neutral-700/60">
                  <SparklesIcon className="w-4 h-4 text-neutral-200" />
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-400">AI Assistant</span>
                <button
                  onClick={() => {
                    setIsExpanded(false)
                    setMessage('')
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                disabled={isLoading}
                className="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none resize-none min-h-[24px] max-h-[120px]"
                rows={1}
                autoFocus
              />
              
              {message.trim() && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-800/50">
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <kbd className="px-1.5 py-0.5 bg-neutral-800/50 rounded">⌘</kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 bg-neutral-800/50 rounded">Enter</kbd>
                  </div>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={!message.trim() || isLoading}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-lg transition-all",
                      message.trim() && !isLoading
                        ? "bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
                        : "bg-neutral-800/50 text-neutral-500 cursor-not-allowed"
                  )}
                >
                    {isLoading ? (
                      <span className="flex items-center gap-1">
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Enviando...
                      </span>
                    ) : (
                      "Enviar"
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
