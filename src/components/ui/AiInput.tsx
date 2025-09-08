"use client"

import React from "react"
import { createPortal } from "react-dom"
import { cx } from "class-variance-authority"
import { AnimatePresence, motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { useClickOutside } from "@/hooks/use-click-outside"
import SiriOrb from "@/components/ui/SiriOrb"

const SPEED = 1

interface FooterContext {
  showFeedback: boolean
  success: boolean
  openFeedback: () => void
  closeFeedback: () => void
}

const FooterContext = React.createContext({} as FooterContext)
const useFooter = () => React.useContext(FooterContext)

interface MorphSurfaceProps {
  onSubmit?: (message: string) => Promise<string | AsyncIterable<string> | void>
  placeholder?: string
}

export function MorphSurface({ onSubmit, placeholder = "Pergunte algo..." }: MorphSurfaceProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)

  const feedbackRef = React.useRef<HTMLTextAreaElement | null>(null)
  const [showFeedback, setShowFeedback] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [chatMessages, setChatMessages] = React.useState<Array<{role: string, content: string}>>([])
  const [isLoading, setIsLoading] = React.useState(false)

  // Persist last 10 messages between sessions (storage only; UI starts limpa)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('zenith-ai-last10')
      if (raw) {
        JSON.parse(raw) // valida formato, mas não repovoa UI
      }
    } catch {}
  }, [])

  const persistLast10 = React.useCallback((messages: Array<{role: string, content: string}>) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('zenith-ai-last10')
      const prev: Array<{role: string, content: string, ts?: number}> = raw ? JSON.parse(raw) : []
      const appended = [...prev, ...messages.map(m => ({ ...m, ts: Date.now() }))]
      const last10 = appended.slice(-10)
      localStorage.setItem('zenith-ai-last10', JSON.stringify(last10))
    } catch {}
  }, [])

  const closeFeedback = React.useCallback(() => {
    setShowFeedback(false)
    feedbackRef.current?.blur()
  }, [])

  const openFeedback = React.useCallback(() => {
    setShowFeedback(true)
    setTimeout(() => {
      feedbackRef.current?.focus()
    })
  }, [])

  const onFeedbackSuccess = React.useCallback(async () => {
    const message = feedbackRef.current?.value
    if (message) {
      // Adiciona mensagem do usuário ao chat e salva histórico
      setChatMessages(prev => {
        const next = [...prev, { role: 'user', content: message }]
        persistLast10([{ role: 'user', content: message }])
        return next
      })
      if (feedbackRef.current) feedbackRef.current.value = ""
      
      // Simula loading
      setIsLoading(true)
      
      if (onSubmit) {
        try {
          const result: any = await onSubmit(message)
          // Suporta streaming via AsyncIterable<string>
          if (result && typeof result === 'object' && typeof result[Symbol.asyncIterator] === 'function') {
            let acc = ''
            setChatMessages(prev => [...prev, { role: 'assistant', content: '' }])
            for await (const chunk of result as AsyncIterable<string>) {
              acc += String(chunk)
              setChatMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: 'assistant', content: acc }
                return copy
              })
            }
            persistLast10([{ role: 'assistant', content: acc }])
          } else if (typeof result === 'string' && result.length > 0) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: result }])
            persistLast10([{ role: 'assistant', content: result }])
          }
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }
  }, [onSubmit])

  useClickOutside(rootRef, closeFeedback)

  const context = React.useMemo(
    () => ({
      showFeedback,
      success,
      openFeedback,
      closeFeedback,
    }),
    [showFeedback, success, openFeedback, closeFeedback]
  )

  return (
    <>
      {/* Botão AI */}
      <motion.div
        className="bg-neutral-950 border border-neutral-800 rounded-full overflow-hidden shadow-lg shadow-black/20"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <FooterContext.Provider value={context}>
          <Dock />
        </FooterContext.Provider>
      </motion.div>

      {/* Modal centralizado */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showFeedback && (
            <>
              {/* Backdrop */}
              <motion.div
                className="fixed inset-0 bg-black/50 z-[1000]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeFeedback}
              />
              
              {/* Center container */}
              <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4 sm:p-6">
                {/* Modal de feedback */}
                <motion.div
                  ref={rootRef}
                  className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl"
                  style={{
                    width: "min(500px, 90vw)",
                    height: "min(600px, 85vh)",
                    maxWidth: "90vw",
                    maxHeight: "85vh"
                  }}
                  initial={{ 
                    opacity: 0,
                    scale: 0.9
                  }}
                  animate={{ 
                    opacity: 1,
                    scale: 1
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.9
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 550 / SPEED,
                    damping: 45,
                    mass: 0.7,
                  }}
                >
                  <FooterContext.Provider value={context}>
                    <Feedback 
                      feedbackRef={feedbackRef} 
                      onSuccess={onFeedbackSuccess} 
                      placeholder={placeholder}
                      chatMessages={chatMessages}
                      isLoading={isLoading}
                    />
                  </FooterContext.Provider>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

function Dock() {
  const { showFeedback, openFeedback } = useFooter()
  return (
    <footer className="mt-auto flex h-[44px] items-center justify-center whitespace-nowrap select-none">
      <div className="flex items-center justify-center gap-2 px-3 max-sm:h-10 max-sm:px-2">
        <div className="flex w-fit items-center gap-2">
          <AnimatePresence mode="wait">
            {showFeedback ? (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                className="h-5 w-5"
              />
            ) : (
              <motion.div
                key="siri-orb"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <SiriOrb
                  size="24px"
                  colors={{
                    bg: "oklch(22.64% 0 0)",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          type="button"
          className="flex h-fit flex-1 justify-center rounded-full px-3 py-1.5 sm:px-4 sm:py-2 text-neutral-200 hover:bg-neutral-800 min-w-[50px] sm:min-w-[60px]"
          variant="ghost"
          onClick={openFeedback}
        >
          <span className="font-semibold text-sm sm:text-base">AI</span>
        </Button>
      </div>
    </footer>
  )
}

const FEEDBACK_WIDTH = "100%"
const FEEDBACK_HEIGHT = "100%"

function Feedback({
  feedbackRef,
  onSuccess,
  placeholder,
  chatMessages = [],
  isLoading = false,
}: {
  feedbackRef: React.RefObject<HTMLTextAreaElement>
  onSuccess: () => void
  placeholder?: string
  chatMessages?: Array<{role: string, content: string}>
  isLoading?: boolean
}) {
  const { closeFeedback, showFeedback } = useFooter()
  const submitRef = React.useRef<HTMLButtonElement>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSuccess()
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      closeFeedback()
    }
    // Enviar com Enter. Para quebra de linha, use Shift+Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submitRef.current?.click()
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col h-full w-full"
      style={{
        pointerEvents: showFeedback ? "all" : "none",
      }}
    >
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 550 / SPEED,
              damping: 45,
              mass: 0.7,
            }}
            className="flex h-full flex-col w-full"
          >
            <div className="flex justify-between items-center py-3 px-4 border-b border-neutral-800 bg-neutral-900/50">
              <p className="text-neutral-300 flex items-center gap-2 select-none text-sm font-medium">
                <SiriOrb size="20px" />
                Assistente AI
              </p>
              <button
                type="button"
                onClick={closeFeedback}
                className="text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Área de chat */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-gradient-to-b from-neutral-950 to-neutral-900/50">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                  <div className="mb-4">
                    <SiriOrb size="48px" colors={{ bg: "oklch(22.64% 0 0)" }} />
                  </div>
                  <h3 className="text-neutral-300 text-lg font-medium mb-2">Capture um pensamento para começar</h3>
                  <p className="text-neutral-500 text-sm max-w-xs">
                    Como posso ajudar você hoje? Digite abaixo ou pressione ESC para fechar.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                      msg.role === 'user' 
                        ? 'bg-neutral-800/70 text-neutral-200 border border-neutral-700/60' 
                        : 'bg-neutral-900/70 text-neutral-300 border border-neutral-800/60'
                    }`}>
                      {renderMessage(msg.content)}
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-900/60 text-neutral-300 border border-neutral-800/60 px-3 py-2 rounded-lg text-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Input area */}
            <div className="p-4 sm:p-6 border-t border-neutral-800 bg-neutral-900/30">
              <div className="relative">
                <textarea
                  ref={feedbackRef}
                  placeholder={placeholder || "Pergunte algo ou adicione uma tarefa..."}
                  name="message"
                  className="w-full bg-neutral-950 text-neutral-100 resize-none rounded-lg p-3 sm:p-4 pr-16 outline-0 placeholder:text-neutral-500 min-h-[60px] max-h-32 border border-neutral-800 focus:border-neutral-700 transition-colors"
                  rows={2}
                  onKeyDown={onKeyDown}
                  spellCheck={false}
                />
                <button
                  type="submit"
                  ref={submitRef}
                  className="absolute right-3 bottom-3 p-2 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                  disabled={isLoading}
                  title="Enviar (⌘+Enter)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m22 2-7 20-4-9-9-4zm0 0-10 10" />
                  </svg>
                </button>
              </div>
              <div className="absolute bottom-6 right-16 opacity-50">
                <span className="text-xs text-neutral-600 flex items-center gap-1">
                  <Kbd className="text-xs px-1 py-0.5 bg-neutral-800/50">⌘</Kbd>
                  <Kbd className="text-xs px-1 py-0.5 bg-neutral-800/50">Enter</Kbd>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  )
}

function renderMessage(text: string) {
  // Colapsável para plano de execução (delimitadores :::plan ... :::)
  if (text.startsWith('Entendi. Vou executar:') || text.startsWith('Entendi. Vou executar')) {
    const rest = text.replace(/^Entendi\. Vou executar:\s*/,'')
    return (
      <details>
        <summary className="cursor-pointer text-neutral-200">Plano de execução</summary>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-neutral-300">
          {rest.split(/,\s*/).map((a,i)=> <li key={i}>{a}</li>)}
        </ul>
      </details>
    )
  }
  // Bullets simples
  const lines = text.split('\n')
  const isList = lines.every(l => l.trim().startsWith('•') || l.trim().startsWith('-') || l.trim().length===0)
  if (isList) {
    return (
      <ul className="list-disc pl-5 space-y-1">
        {lines.filter(l=>l.trim().length>0).map((l,i)=> <li key={i}>{l.replace(/^[-•]\s*/,'')}</li>)}
      </ul>
    )
  }
  return <pre className="whitespace-pre-wrap font-sans">{text}</pre>
}

const LOGO_SPRING = {
  type: "spring",
  stiffness: 350 / SPEED,
  damping: 35,
} as const

function Kbd({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <kbd
      className={cx(
        "bg-neutral-900/50 text-neutral-500 flex h-5 w-fit items-center justify-center rounded border border-neutral-700/30 px-1.5 font-sans text-xs",
        className
      )}
    >
      {children}
    </kbd>
  )
}

// Add default export for lazy loading
export default MorphSurface
