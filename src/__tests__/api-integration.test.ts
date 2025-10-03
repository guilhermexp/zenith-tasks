/**
 * Integration tests for API endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

describe('API Integration Tests', () => {
  const baseUrl = 'http://localhost:3000'

  describe('Health Check API', () => {
    it('should return health status', async () => {
      const response = await fetch(`${baseUrl}/api/debug/health`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('services')
      expect(data.services).toHaveProperty('database')
      expect(data.services).toHaveProperty('auth')
      expect(data.services).toHaveProperty('ai')
    })

    it('should handle database test requests', async () => {
      const response = await fetch(`${baseUrl}/api/debug/health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service: 'database',
          test: 'write'
        })
      })

      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('service', 'database')
      expect(data).toHaveProperty('test', 'write')
    })
  })

  describe('Chat API', () => {
    it('should handle assistant chat requests', async () => {
      const response = await fetch(`${baseUrl}/api/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Hello, this is a test message',
          userId: 'test-user-123'
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Should return either commands or reply
      expect(data).toHaveProperty('commands')
      expect(Array.isArray(data.commands)).toBe(true)
    })

    it('should handle chat for item requests', async () => {
      const response = await fetch(`${baseUrl}/api/chat/for-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Task',
          type: 'Tarefa',
          message: 'How can I complete this task?',
          summary: 'This is a test task for integration testing'
        })
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('text')
      expect(typeof data.text).toBe('string')
    })

    it('should validate required fields for chat requests', async () => {
      const response = await fetch(`${baseUrl}/api/chat/for-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: '',
          type: 'Tarefa',
          message: ''
        })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(65).fill(null).map(() => 
        fetch(`${baseUrl}/api/assistant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Rate limit test',
            userId: 'rate-limit-test-user'
          })
        })
      )

      const responses = await Promise.all(requests)
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe('Speech Transcription API', () => {
    it('should handle transcription requests with base64 audio', async () => {
      // Mock base64 audio data (very small sample)
      const mockAudioBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='

      const response = await fetch(`${baseUrl}/api/speech/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioBase64: mockAudioBase64,
          mimeType: 'audio/wav'
        })
      })

      // May return 501 if Google provider not configured in test
      expect([200, 501]).toContain(response.status)
      
      if (response.status === 200) {
        const data = await response.json()
        expect(data).toHaveProperty('text')
      }
    })

    it('should validate required audio data', async () => {
      const response = await fetch(`${baseUrl}/api/speech/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mimeType: 'audio/wav'
        })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })
  })

  describe('Models API', () => {
    it('should return available models', async () => {
      const response = await fetch(`${baseUrl}/api/models`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
      expect(Array.isArray(data.models)).toBe(true)
      expect(data).toHaveProperty('total')
      expect(Array.isArray(data.providers)).toBe(true)
    })

    it('should return recommended models for context', async () => {
      const response = await fetch(`${baseUrl}/api/models?recommended=true&context=chat&limit=5`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('context', 'chat')
      expect(Array.isArray(data.models)).toBe(true)
      expect(data.models.length).toBeLessThanOrEqual(5)
    })

    it('should filter models by provider', async () => {
      const response = await fetch(`${baseUrl}/api/models?provider=openai`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('success', true)
      
      if (data.models.length > 0) {
        data.models.forEach((model: any) => {
          expect(model.provider).toBe('openai')
        })
      }
    })
  })

  describe('Error Reports API', () => {
    it('should accept error reports', async () => {
      const errorReport = {
        type: 'bug',
        title: 'Test Error Report',
        description: 'This is a test error report for integration testing',
        priority: 'medium',
        browserInfo: {
          userAgent: 'Test Agent',
          url: 'http://localhost:3000/test',
          timestamp: new Date().toISOString()
        }
      }

      const response = await fetch(`${baseUrl}/api/error-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('reportId')
      expect(data).toHaveProperty('estimatedResponse')
    })

    it('should validate required fields for error reports', async () => {
      const invalidReport = {
        type: 'bug',
        title: '',
        description: '',
        priority: 'medium'
      }

      const response = await fetch(`${baseUrl}/api/error-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidReport)
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should handle rate limiting for error reports', async () => {
      const errorReport = {
        type: 'bug',
        title: 'Rate Limit Test',
        description: 'Testing rate limiting',
        priority: 'low',
        browserInfo: {
          userAgent: 'Test Agent',
          url: 'http://localhost:3000/test',
          timestamp: new Date().toISOString()
        }
      }

      // Make multiple rapid requests
      const requests = Array(10).fill(null).map(() => 
        fetch(`${baseUrl}/api/error-reports`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(errorReport)
        })
      )

      const responses = await Promise.all(requests)
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe('Meeting API', () => {
    it('should handle meeting summarization', async () => {
      const meetingData = {
        transcript: 'João: Olá pessoal, vamos começar a reunião. Maria: Perfeito, temos três pontos na agenda hoje.',
        context: {
          title: 'Reunião de Planejamento',
          participants: ['João', 'Maria']
        }
      }

      const response = await fetch(`${baseUrl}/api/meetings/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(meetingData)
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('summary')
      expect(data.summary).toHaveProperty('summary')
      expect(data.summary).toHaveProperty('topics')
      expect(Array.isArray(data.summary.topics)).toBe(true)
    })

    it('should validate transcript requirement', async () => {
      const response = await fetch(`${baseUrl}/api/meetings/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          context: { title: 'Test Meeting' }
        })
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })
  })

  describe('Credits API', () => {
    it('should return credit information', async () => {
      const response = await fetch(`${baseUrl}/api/credits`)
      
      // Should return 200 or appropriate status
      expect([200, 429, 500]).toContain(response.status)
      
      if (response.status === 200) {
        const data = await response.json()
        expect(data).toHaveProperty('success', true)
        expect(data).toHaveProperty('credits')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await fetch(`${baseUrl}/api/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      expect(response.status).toBe(400)
    })

    it('should handle missing content-type header', async () => {
      const response = await fetch(`${baseUrl}/api/assistant`, {
        method: 'POST',
        body: JSON.stringify({ message: 'test' })
      })

      // Should handle gracefully
      expect([200, 400, 415]).toContain(response.status)
    })

    it('should return appropriate CORS headers', async () => {
      const response = await fetch(`${baseUrl}/api/models`, {
        method: 'OPTIONS'
      })

      // Should handle OPTIONS request
      expect([200, 204, 405]).toContain(response.status)
    })
  })

  describe('Performance Tests', () => {
    it('should respond to health check within reasonable time', async () => {
      const startTime = Date.now()
      const response = await fetch(`${baseUrl}/api/debug/health`)
      const endTime = Date.now()

      expect(response.status).toBe(200)
      expect(endTime - startTime).toBeLessThan(5000) // 5 seconds max
    })

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 10
      const requests = Array(concurrentRequests).fill(null).map(() => 
        fetch(`${baseUrl}/api/models`)
      )

      const startTime = Date.now()
      const responses = await Promise.all(requests)
      const endTime = Date.now()

      // All requests should succeed or fail gracefully
      responses.forEach(response => {
        expect([200, 429, 500, 503]).toContain(response.status)
      })

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000) // 10 seconds max
    })
  })
})

describe('API Security Tests', () => {
  const baseUrl = 'http://localhost:3000'

  it('should sanitize input in chat requests', async () => {
    const maliciousInput = '<script>alert("xss")</script>'
    
    const response = await fetch(`${baseUrl}/api/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: maliciousInput,
        userId: 'test-user'
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    
    // Response should not contain the malicious script
    const responseText = JSON.stringify(data)
    expect(responseText).not.toContain('<script>')
    expect(responseText).not.toContain('alert(')
  })

  it('should handle SQL injection attempts', async () => {
    const sqlInjection = "'; DROP TABLE users; --"
    
    const response = await fetch(`${baseUrl}/api/chat/for-item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: sqlInjection,
        type: 'Tarefa',
        message: 'test message'
      })
    })

    // Should handle gracefully without exposing database errors
    expect([200, 400]).toContain(response.status)
  })

  it('should validate content length', async () => {
    const veryLongMessage = 'a'.repeat(100000) // 100KB message
    
    const response = await fetch(`${baseUrl}/api/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: veryLongMessage,
        userId: 'test-user'
      })
    })

    // Should handle large payloads appropriately
    expect([200, 400, 413]).toContain(response.status)
  })
})