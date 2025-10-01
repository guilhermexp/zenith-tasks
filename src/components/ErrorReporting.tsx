/**
 * User-friendly error reporting interface
 */

'use client'

import { AlertTriangle, Send, X, CheckCircle, Info, Bug, Zap } from 'lucide-react'
import React, { useState, useEffect } from 'react'

export interface ErrorReport {
  id: string
  type: 'bug' | 'performance' | 'feature' | 'other'
  title: string
  description: string
  steps?: string
  expectedBehavior?: string
  actualBehavior?: string
  browserInfo: {
    userAgent: string
    url: string
    timestamp: string
  }
  systemInfo?: {
    component?: string
    errorMessage?: string
    stackTrace?: string
  }
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'submitted' | 'acknowledged' | 'investigating' | 'resolved'
  userEmail?: string
  attachments?: File[]
}

interface ErrorReportingProps {
  isOpen: boolean
  onClose: () => void
  initialError?: {
    component?: string
    message?: string
    stack?: string
  }
}

export default function ErrorReporting({ isOpen, onClose, initialError }: ErrorReportingProps) {
  const [reportType, setReportType] = useState<ErrorReport['type']>('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [expectedBehavior, setExpectedBehavior] = useState('')
  const [actualBehavior, setActualBehavior] = useState('')
  const [priority, setPriority] = useState<ErrorReport['priority']>('medium')
  const [userEmail, setUserEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Auto-populate fields if initial error is provided
  useEffect(() => {
    if (initialError) {
      setReportType('bug')
      setTitle(initialError.message || 'Erro no sistema')
      setDescription(`Erro detectado automaticamente: ${initialError.message || 'Erro desconhecido'}`)
      setActualBehavior(initialError.message || '')
      setPriority('high')
    }
  }, [initialError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const report: Omit<ErrorReport, 'id' | 'status'> = {
        type: reportType,
        title,
        description,
        steps: steps || undefined,
        expectedBehavior: expectedBehavior || undefined,
        actualBehavior: actualBehavior || undefined,
        priority,
        userEmail: userEmail || undefined,
        browserInfo: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        },
        systemInfo: initialError ? {
          component: initialError.component,
          errorMessage: initialError.message,
          stackTrace: initialError.stack
        } : undefined
      }

      const response = await fetch('/api/error-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      })

      if (!response.ok) {
        throw new Error('Falha ao enviar relatório')
      }

      setIsSubmitted(true)
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose()
        resetForm()
      }, 3000)

    } catch (error: any) {
      setSubmitError(error.message || 'Erro ao enviar relatório')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setReportType('bug')
    setTitle('')
    setDescription('')
    setSteps('')
    setExpectedBehavior('')
    setActualBehavior('')
    setPriority('medium')
    setUserEmail('')
    setIsSubmitted(false)
    setSubmitError(null)
  }

  const getTypeIcon = (type: ErrorReport['type']) => {
    switch (type) {
      case 'bug':
        return <Bug className="w-5 h-5 text-red-400" />
      case 'performance':
        return <Zap className="w-5 h-5 text-yellow-400" />
      case 'feature':
        return <Info className="w-5 h-5 text-blue-400" />
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: ErrorReport['priority']) => {
    switch (priority) {
      case 'critical':
        return 'text-red-500 bg-red-500/10 border-red-500/20'
      case 'high':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      case 'low':
        return 'text-green-500 bg-green-500/10 border-green-500/20'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-semibold text-white">
              {isSubmitted ? 'Relatório Enviado' : 'Relatar Problema'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSubmitted ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Relatório enviado com sucesso!
              </h3>
              <p className="text-neutral-400 mb-4">
                Obrigado por nos ajudar a melhorar o sistema. Analisaremos seu relatório em breve.
              </p>
              <p className="text-sm text-neutral-500">
                Esta janela será fechada automaticamente...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Tipo de Problema
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'bug', label: 'Bug/Erro', desc: 'Algo não está funcionando' },
                    { value: 'performance', label: 'Performance', desc: 'Sistema lento' },
                    { value: 'feature', label: 'Sugestão', desc: 'Nova funcionalidade' },
                    { value: 'other', label: 'Outro', desc: 'Outro tipo de problema' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setReportType(type.value as ErrorReport['type'])}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        reportType === type.value
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-neutral-700 hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeIcon(type.value as ErrorReport['type'])}
                        <span className="font-medium text-white">{type.label}</span>
                      </div>
                      <p className="text-xs text-neutral-400">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Título do Problema *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Descreva brevemente o problema"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Descrição Detalhada *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o problema em detalhes..."
                  rows={4}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  required
                />
              </div>

              {/* Steps to Reproduce (for bugs) */}
              {reportType === 'bug' && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Passos para Reproduzir
                  </label>
                  <textarea
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    placeholder="1. Faça isso...&#10;2. Depois isso...&#10;3. O erro acontece..."
                    rows={3}
                    className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  />
                </div>
              )}

              {/* Expected vs Actual Behavior (for bugs) */}
              {reportType === 'bug' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Comportamento Esperado
                    </label>
                    <textarea
                      value={expectedBehavior}
                      onChange={(e) => setExpectedBehavior(e.target.value)}
                      placeholder="O que deveria acontecer?"
                      rows={3}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-300 mb-2">
                      Comportamento Atual
                    </label>
                    <textarea
                      value={actualBehavior}
                      onChange={(e) => setActualBehavior(e.target.value)}
                      placeholder="O que realmente acontece?"
                      rows={3}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Prioridade
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'low', label: 'Baixa' },
                    { value: 'medium', label: 'Média' },
                    { value: 'high', label: 'Alta' },
                    { value: 'critical', label: 'Crítica' }
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value as ErrorReport['priority'])}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        priority === p.value
                          ? getPriorityColor(p.value as ErrorReport['priority'])
                          : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email (optional) */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Para receber atualizações sobre o problema
                </p>
              </div>

              {/* System Info (if available) */}
              {initialError && (
                <div className="p-4 bg-neutral-800/50 rounded-lg">
                  <h4 className="text-sm font-medium text-neutral-300 mb-2">
                    Informações Técnicas
                  </h4>
                  <div className="space-y-1 text-xs text-neutral-400">
                    {initialError.component && (
                      <p><span className="text-neutral-300">Componente:</span> {initialError.component}</p>
                    )}
                    {initialError.message && (
                      <p><span className="text-neutral-300">Erro:</span> {initialError.message}</p>
                    )}
                    <p><span className="text-neutral-300">URL:</span> {window.location.href}</p>
                    <p><span className="text-neutral-300">Navegador:</span> {navigator.userAgent.split(' ').slice(-2).join(' ')}</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {submitError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{submitError}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !description.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar Relatório
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}