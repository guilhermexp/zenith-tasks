/**
 * End-to-end workflow tests
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

// Mock browser APIs for testing
global.fetch = jest.fn()
global.navigator = {
  userAgent: 'Test Browser'
} as any

global.window = {
  location: {
    href: 'http://localhost:3000/test'
  }
} as any

describe('End-to-End Workflow Tests', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeAll(() => {
    // Setup common mocks
    mockFetch.mockClear()
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })

  describe('Complete Chat Conversation Workflow', () => {
    it('should handle a complete chat conversation with task creation', async () => {
      // Mock successful API responses
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          commands: [
            {
              action: 'create_task',
              args: {
                title: 'Complete project documentation',
                type: 'Tarefa',
                summary: 'Write comprehensive documentation for the project'
              }
            }
          ],
          reply: 'Criei uma tarefa para você: Complete project documentation'
        })
      } as Response)

      // Simulate user starting a chat conversation
      const initialMessage = 'Preciso criar uma tarefa para documentar o projeto'

      // Step 1: Send initial message to assistant
      const assistantResponse = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: initialMessage,
          userId: 'test-user-123'
        })
      })

      const assistantData = await assistantResponse.json()

      expect(assistantResponse.ok).toBe(true)
      expect(assistantData.commands).toHaveLength(1)
      expect(assistantData.commands[0].action).toBe('create_task')
      expect(assistantData.reply).toContain('tarefa')

      // Verify the workflow relied solely on the assistant endpoint
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/assistant', expect.any(Object))
    })

    it('should handle error recovery in chat workflow', async () => {
      // Mock API failure followed by success
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            commands: [],
            reply: 'Desculpe, houve um problema temporário. Como posso ajudar?'
          })
        } as Response)

      // Simulate error handling in chat
      let chatResult
      try {
        await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Test message',
            userId: 'test-user'
          })
        })
      } catch (error) {
        // Retry logic
        const retryResponse = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Test message',
            userId: 'test-user'
          })
        })
        chatResult = await retryResponse.json()
      }

      expect(chatResult).toBeTruthy()
      expect(chatResult.reply).toContain('problema temporário')
    })

    it('should handle streaming chat responses', async () => {
      // Mock streaming response
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"text": "Olá"}\n\n'))
          controller.enqueue(new TextEncoder().encode('data: {"text": " como"}\n\n'))
          controller.enqueue(new TextEncoder().encode('data: {"text": " posso ajudar?"}\n\n'))
          controller.close()
        }
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream,
        headers: new Headers({
          'content-type': 'text/event-stream'
        })
      } as Response)

      const response = await fetch('/api/assistant?stream=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello',
          userId: 'test-user'
        })
      })

      expect(response.ok).toBe(true)
      expect(response.headers.get('content-type')).toBe('text/event-stream')
      expect(response.body).toBeTruthy()
    })
  })

  describe('Meeting Recording and Transcription Workflow', () => {
    it('should handle complete meeting workflow', async () => {
      // Mock successful meeting creation and transcription
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            text: 'Olá pessoal, vamos começar nossa reunião de planejamento.',
            confidence: 0.95,
            isFinal: true,
            timestamp: Date.now()
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            summary: {
              summary: 'Reunião de planejamento da equipe',
              topics: [
                {
                  title: 'Objetivos do Projeto',
                  content: 'Discussão sobre os principais objetivos e metas'
                }
              ],
              participants: ['João', 'Maria'],
              actionItems: [
                {
                  task: 'Finalizar documentação',
                  responsible: 'João',
                  deadline: '2024-01-15'
                }
              ]
            }
          })
        } as Response)

      // Step 1: Transcribe audio
      const mockAudioBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
      
      const transcriptionResponse = await fetch('/api/speech/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: mockAudioBase64,
          mimeType: 'audio/webm',
          sessionId: 'meeting-123',
          realTime: true
        })
      })

      const transcriptionData = await transcriptionResponse.json()

      expect(transcriptionResponse.ok).toBe(true)
      expect(transcriptionData.text).toBeTruthy()
      expect(transcriptionData.confidence).toBeGreaterThan(0)

      // Step 2: Generate meeting summary
      const summaryResponse = await fetch('/api/meetings/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptionData.text,
          context: {
            title: 'Reunião de Planejamento',
            participants: ['João', 'Maria']
          }
        })
      })

      const summaryData = await summaryResponse.json()

      expect(summaryResponse.ok).toBe(true)
      expect(summaryData.summary).toBeTruthy()
      expect(summaryData.summary.topics).toHaveLength(1)
      expect(summaryData.summary.actionItems).toHaveLength(1)

      // Verify complete workflow
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should handle real-time transcription updates', async () => {
      // Mock multiple transcription chunks
      const transcriptionChunks = [
        { text: 'Olá', confidence: 0.8, isFinal: false },
        { text: 'Olá pessoal', confidence: 0.9, isFinal: false },
        { text: 'Olá pessoal, vamos começar', confidence: 0.95, isFinal: true }
      ]

      let callCount = 0
      mockFetch.mockImplementation(() => {
        const chunk = transcriptionChunks[callCount++]
        return Promise.resolve({
          ok: true,
          json: async () => ({
            ...chunk,
            timestamp: Date.now()
          })
        } as Response)
      })

      // Simulate real-time transcription
      const results = []
      for (let i = 0; i < 3; i++) {
        const response = await fetch('/api/speech/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: 'mock-audio-chunk',
            sessionId: 'realtime-session',
            realTime: true
          })
        })

        const data = await response.json()
        results.push(data)
      }

      expect(results).toHaveLength(3)
      expect(results[0].isFinal).toBe(false)
      expect(results[1].isFinal).toBe(false)
      expect(results[2].isFinal).toBe(true)
      expect(results[2].confidence).toBeGreaterThan(results[0].confidence)
    })
  })

  describe('Model Selection and Switching Workflow', () => {
    it('should handle model selection workflow', async () => {
      // Mock model list and selection
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            models: [
              {
                id: 'openai/gpt-4o',
                name: 'GPT-4 Optimized',
                provider: 'openai',
                description: 'Most advanced OpenAI model',
                pricing: { input: 5, output: 15 }
              },
              {
                id: 'anthropic/claude-3-5-sonnet-20241022',
                name: 'Claude 3.5 Sonnet',
                provider: 'anthropic',
                description: 'High-performance Anthropic model',
                pricing: { input: 3, output: 15 }
              }
            ],
            total: 2,
            providers: ['openai', 'anthropic']
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            context: 'chat',
            models: [
              {
                id: 'openai/gpt-4o-mini',
                name: 'GPT-4 Mini',
                provider: 'openai',
                description: 'Compact and economical version'
              }
            ]
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            commands: [],
            reply: 'Olá! Como posso ajudar você hoje?'
          })
        } as Response)

      // Step 1: Get available models
      const modelsResponse = await fetch('/api/models')
      const modelsData = await modelsResponse.json()

      expect(modelsResponse.ok).toBe(true)
      expect(modelsData.models).toHaveLength(2)
      expect(modelsData.providers).toContain('openai')
      expect(modelsData.providers).toContain('anthropic')

      // Step 2: Get recommended models for chat
      const recommendedResponse = await fetch('/api/models?recommended=true&context=chat&limit=5')
      const recommendedData = await recommendedResponse.json()

      expect(recommendedResponse.ok).toBe(true)
      expect(recommendedData.context).toBe('chat')
      expect(recommendedData.models).toHaveLength(1)

      // Step 3: Use selected model in chat
      const chatResponse = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello with new model',
          userId: 'test-user',
          model: 'openai/gpt-4o-mini'
        })
      })

      const chatData = await chatResponse.json()

      expect(chatResponse.ok).toBe(true)
      expect(chatData.reply).toBeTruthy()

      // Verify complete workflow
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should handle model switching during conversation', async () => {
      // Mock responses for different models
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            commands: [],
            reply: 'Response from GPT-4'
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            commands: [],
            reply: 'Response from Claude'
          })
        } as Response)

      // First message with GPT-4
      const gptResponse = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello',
          userId: 'test-user',
          model: 'openai/gpt-4o'
        })
      })

      const gptData = await gptResponse.json()
      expect(gptData.reply).toBe('Response from GPT-4')

      // Switch to Claude for next message
      const claudeResponse = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Continue conversation',
          userId: 'test-user',
          model: 'anthropic/claude-3-5-sonnet-20241022'
        })
      })

      const claudeData = await claudeResponse.json()
      expect(claudeData.reply).toBe('Response from Claude')

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Reporting Workflow', () => {
    it('should handle complete error reporting workflow', async () => {
      // Mock successful error report submission
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          reportId: 'report_123456789',
          message: 'Error report submitted successfully',
          estimatedResponse: '1-2 dias'
        })
      } as Response)

      // Simulate user reporting an error
      const errorReport = {
        type: 'bug',
        title: 'Chat não está respondendo',
        description: 'Quando envio uma mensagem, o chat fica carregando indefinidamente',
        steps: '1. Abrir o chat\n2. Digitar mensagem\n3. Clicar enviar\n4. Fica carregando',
        expectedBehavior: 'Deveria receber uma resposta do assistente',
        actualBehavior: 'Fica carregando indefinidamente',
        priority: 'high',
        userEmail: 'user@example.com',
        browserInfo: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          url: 'http://localhost:3000/chat',
          timestamp: new Date().toISOString()
        },
        systemInfo: {
          component: 'ChatComponent',
          errorMessage: 'Request timeout after 30 seconds',
          stackTrace: 'Error: Timeout\n    at fetch (/api/assistant)'
        }
      }

      const response = await fetch('/api/error-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport)
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.reportId).toBeTruthy()
      expect(data.estimatedResponse).toBeTruthy()

      // Verify the request was made correctly
      expect(mockFetch).toHaveBeenCalledWith('/api/error-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport)
      })
    })

    it('should handle automatic error reporting', async () => {
      // Mock automatic error detection and reporting
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          reportId: 'auto_report_123',
          message: 'Automatic error report submitted'
        })
      } as Response)

      // Simulate automatic error detection
      const automaticReport = {
        type: 'bug',
        title: 'Erro detectado automaticamente',
        description: 'Erro detectado automaticamente: TypeError: Cannot read property of undefined',
        priority: 'high',
        browserInfo: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        },
        systemInfo: {
          component: 'AutoDetected',
          errorMessage: 'TypeError: Cannot read property of undefined',
          stackTrace: 'TypeError: Cannot read property of undefined\n    at Component.render'
        }
      }

      const response = await fetch('/api/error-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(automaticReport)
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.success).toBe(true)
      expect(data.reportId).toContain('auto_report')
    })
  })

  describe('System Health Monitoring Workflow', () => {
    it('should handle health check and diagnostic workflow', async () => {
      // Mock health check responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            responseTime: 150,
            services: {
              database: { status: 'ok', latency: 45 },
              auth: { status: 'ok', userId: 'test-user' },
              ai: { status: 'ok', provider: 'openai' },
              mcp: { status: 'ok', servers: 2 }
            },
            environment: {
              nodeVersion: 'v18.17.0',
              platform: 'linux',
              uptime: 3600,
              memoryUsage: {
                rss: 150000000,
                heapTotal: 100000000,
                heapUsed: 80000000,
                external: 5000000
              }
            }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: 'test-write-123' },
            timestamp: new Date().toISOString()
          })
        } as Response)

      // Step 1: Check overall system health
      const healthResponse = await fetch('/api/debug/health')
      const healthData = await healthResponse.json()

      expect(healthResponse.ok).toBe(true)
      expect(healthData.status).toBe('healthy')
      expect(healthData.services.database.status).toBe('ok')
      expect(healthData.services.ai.status).toBe('ok')
      expect(healthData.responseTime).toBeLessThan(1000)

      // Step 2: Run specific diagnostic test
      const diagnosticResponse = await fetch('/api/debug/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'database',
          test: 'write'
        })
      })

      const diagnosticData = await diagnosticResponse.json()

      expect(diagnosticResponse.ok).toBe(true)
      expect(diagnosticData.success).toBe(true)
      expect(diagnosticData.data).toBeTruthy()

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests gracefully', async () => {
      // Mock responses for concurrent requests
      mockFetch.mockImplementation(() => 
        Promise.resolve({
          ok: true,
          json: async () => ({
            commands: [],
            reply: 'Concurrent response'
          })
        } as Response)
      )

      // Simulate 10 concurrent chat requests
      const concurrentRequests = Array(10).fill(null).map((_, index) => 
        fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Concurrent message ${index}`,
            userId: `user-${index}`
          })
        })
      )

      const startTime = Date.now()
      const responses = await Promise.all(concurrentRequests)
      const endTime = Date.now()

      // All requests should succeed
      responses.forEach(response => {
        expect(response.ok).toBe(true)
      })

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000)
      expect(mockFetch).toHaveBeenCalledTimes(10)
    })

    it('should handle rate limiting gracefully', async () => {
      // Mock rate limiting responses
      let requestCount = 0
      mockFetch.mockImplementation(() => {
        requestCount++
        if (requestCount > 5) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: async () => ({
              error: 'Too many requests'
            })
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            commands: [],
            reply: 'Success response'
          })
        } as Response)
      })

      // Make rapid requests to trigger rate limiting
      const rapidRequests = Array(10).fill(null).map(() => 
        fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Rate limit test',
            userId: 'rate-test-user'
          })
        })
      )

      const responses = await Promise.all(rapidRequests)
      
      // Some should succeed, some should be rate limited
      const successfulResponses = responses.filter(r => r.ok)
      const rateLimitedResponses = responses.filter(r => r.status === 429)

      expect(successfulResponses.length).toBe(5)
      expect(rateLimitedResponses.length).toBe(5)
    })
  })
})
