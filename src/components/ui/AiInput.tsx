"use client"

import { cx } from "class-variance-authority"
import { AnimatePresence, motion } from "motion/react"
import React from "react"
import { createPortal } from "react-dom"

import { ModelSelector } from "@/components/ModelSelector"
import { Button } from "@/components/ui/button"
import SiriOrb from "@/components/ui/SiriOrb"
import { useClickOutside } from "@/hooks/use-click-outside"

// Temporariamente usando implementação manual até ai/react estar disponível
// TODO: Migrar para useChat do ai/react quando tipos estiverem disponíveis
const useChat = (config: any) => {
  const [messages, setMessages] = React.useState<any[]>([])
  const [input, setInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | undefined>()

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { id: Date.now().toString(), role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(undefined)

    try {
      const res = await fetch(config.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          ...config.body 
        })
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      console.log('[useChat] Response received, has body:', !!res.body)

      if (res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let assistantMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }
        setMessages(prev => [...prev, assistantMessage])
        console.log('[useChat] Created assistant message:', assistantMessage.id)

        let chunkCount = 0
        while (true) {
          const { done, value } = await reader.read()
          console.log('[useChat] Read chunk:', { done, hasValue: !!value, chunkCount })
          if (done) break

          // Decodificar o chunk como texto puro
          const text = decoder.decode(value, { stream: true })
          console.log('[useChat] Decoded text chunk:', text)
          assistantMessage.content += text
          chunkCount++

          // Atualizar mensagem
          setMessages(prev => {
            const copy = [...prev]
            copy[copy.length - 1] = { ...assistantMessage }
            console.log('[useChat] Updated message, total length:', assistantMessage.content.length)
            return copy
          })
        }

        console.log('[useChat] Stream finished, total chunks:', chunkCount, 'final length:', assistantMessage.content.length)
        config.onFinish?.(assistantMessage)
      }
    } catch (err: any) {
      setError(err)
      config.onError?.(err)
    } finally {
      setIsLoading(false)
    }
  }

  const reload = () => {
    // TODO: Implementar reload
  }

  const stop = () => {
    // TODO: Implementar stop
  }

  return { messages, input, handleInputChange, handleSubmit, isLoading, error, reload, stop }
}

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
  placeholder?: string
}

export function MorphSurface({ placeholder = "Pergunte algo..." }: MorphSurfaceProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)

  const feedbackRef = React.useRef<HTMLTextAreaElement | null>(null)
  const [showFeedback, setShowFeedback] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [selectedModel, setSelectedModel] = React.useState<string>('')

  // Usar hook useChat (implementação manual temporária)
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, reload, stop } = useChat({
    api: '/api/assistant/chat?stream=1',
    body: {
      model: selectedModel || undefined,
    },
    onFinish: (message: any) => {
      // Salvar no histórico quando finalizar
      persistMessage(message)
    },
    onError: (error: any) => {
      console.error('[AiInput] Chat error:', error)
    }
  })

  // Persist last 10 messages between sessions
  const persistMessage = React.useCallback((message: any) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('zenith-ai-last10')
      const prev: Array<any> = raw && raw.trim() ? JSON.parse(raw) : []
      const appended = [...prev, { ...message, ts: Date.now() }]
      const last10 = appended.slice(-10)
      localStorage.setItem('zenith-ai-last10', JSON.stringify(last10))
    } catch (error) {
      console.warn('[AiInput] Failed to persist message:', error)
      // Reset corrupted storage
      localStorage.removeItem('zenith-ai-last10')
    }
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
                      messages={messages}
                      input={input}
                      handleInputChange={handleInputChange}
                      handleSubmit={handleSubmit}
                      isLoading={isLoading}
                      error={error}
                      reload={reload}
                      stop={stop}
                      placeholder={placeholder}
                      selectedModel={selectedModel}
                      onModelChange={setSelectedModel}
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
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  error,
  reload,
  stop,
  placeholder,
  selectedModel = '',
  onModelChange,
}: {
  messages: any[]
  input: string
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  isLoading: boolean
  error?: Error
  reload?: () => void
  stop?: () => void
  placeholder?: string
  selectedModel?: string
  onModelChange?: (model: string) => void
}) {
  const { closeFeedback, showFeedback } = useFooter()

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      closeFeedback()
    }
    // Enviar com Enter. Para quebra de linha, use Shift+Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
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
              <div className="text-neutral-300 flex items-center gap-2 select-none text-sm font-medium">
                <SiriOrb size="20px" />
                Assistente AI
              </div>
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
              {messages.length === 0 ? (
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
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-900/20 text-red-400 border border-red-800/60 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                    <span>Erro: {error.message}</span>
                    {reload && (
                      <button
                        onClick={reload}
                        className="text-xs underline hover:text-red-300"
                      >
                        Tentar novamente
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Input area */}
            <div className="p-4 sm:p-6 border-t border-neutral-800 bg-neutral-900/30 space-y-3">
              {/* Model Selector */}
              <div className="w-full">
                <ModelSelector
                  value={selectedModel}
                  onChange={onModelChange}
                  context="chat"
                  className="w-full"
                />
              </div>

              {/* Text Input */}
              <div className="relative">
                <textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder={placeholder || "Pergunte algo ou adicione uma tarefa..."}
                  name="message"
                  className="w-full bg-neutral-950 text-neutral-100 resize-none rounded-lg p-3 sm:p-4 pr-16 outline-0 placeholder:text-neutral-500 min-h-[60px] max-h-32 border border-neutral-800 focus:border-neutral-700 transition-colors"
                  rows={2}
                  onKeyDown={onKeyDown}
                  spellCheck={false}
                  disabled={isLoading}
                />
                <div className="absolute right-3 bottom-3 flex gap-2">
                  {isLoading && stop && (
                    <button
                      type="button"
                      onClick={stop}
                      className="p-2 text-neutral-400 hover:text-white transition-colors"
                      title="Parar geração"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="submit"
                    className="p-2 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                    disabled={isLoading || !input.trim()}
                    title="Enviar (Enter)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m22 2-7 20-4-9-9-4zm0 0-10 10" />
                    </svg>
                  </button>
                </div>
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
