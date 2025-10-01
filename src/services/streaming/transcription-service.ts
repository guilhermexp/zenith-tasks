/**
 * Real-time transcription service with WebSocket support
 */

import { arrayBufferToBase64, base64ToArrayBuffer } from '@/utils/base64'
import { logger } from '@/utils/logger'

type WebSocketEvent = 'message' | 'close' | 'error'
type WebSocketListener = (event?: any) => void

type WebSocketLike = WebSocket & {
  on?: (event: WebSocketEvent, listener: WebSocketListener) => void
  addEventListener?: (event: WebSocketEvent, listener: WebSocketListener) => void
}

export interface TranscriptionChunk {
  text: string
  confidence: number
  isFinal: boolean
  timestamp: number
  speaker?: string
}

export interface TranscriptionOptions {
  language?: string
  enableSpeakerDetection?: boolean
  enablePunctuation?: boolean
  model?: string
}

export class RealTimeTranscriptionService {
  private static instance: RealTimeTranscriptionService
  private activeConnections: Map<string, WebSocketLike> = new Map()
  private transcriptionBuffer: Map<string, TranscriptionChunk[]> = new Map()

  private constructor() {}

  static getInstance(): RealTimeTranscriptionService {
    if (!RealTimeTranscriptionService.instance) {
      RealTimeTranscriptionService.instance = new RealTimeTranscriptionService()
    }
    return RealTimeTranscriptionService.instance
  }

  /**
   * Start real-time transcription session
   */
  async startTranscription(
    sessionId: string,
    options: TranscriptionOptions = {}
  ): Promise<{
    success: boolean
    websocketUrl?: string
    error?: string
  }> {
    try {
      // Initialize buffer for this session
      this.transcriptionBuffer.set(sessionId, [])

      logger.info('[TranscriptionService] Starting session', {
        sessionId,
        options
      })

      return {
        success: true,
        websocketUrl: `/api/transcription/ws?sessionId=${sessionId}`
      }
    } catch (error: any) {
      logger.error('[TranscriptionService] Failed to start session', error, {
        sessionId
      })

      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Process audio chunk for transcription
   */
  async processAudioChunk(
    sessionId: string,
    audioData: ArrayBuffer,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionChunk | null> {
    try {
      // Convert audio to base64 for API call
      const base64Audio = arrayBufferToBase64(audioData)

      // Call transcription API
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: 'audio/webm',
          sessionId,
          realTime: true,
          ...options
        })
      })

      if (!response.ok) {
        throw new Error(`Transcription API error: ${response.status}`)
      }

      const result = await response.json()

      if (result.text) {
        const chunk: TranscriptionChunk = {
          text: result.text,
          confidence: result.confidence || 0.8,
          isFinal: result.isFinal || true,
          timestamp: Date.now(),
          speaker: result.speaker
        }

        // Add to buffer
        const buffer = this.transcriptionBuffer.get(sessionId) || []
        buffer.push(chunk)
        this.transcriptionBuffer.set(sessionId, buffer)

        // Send to connected WebSocket clients
        this.broadcastToSession(sessionId, chunk)

        return chunk
      }

      return null
    } catch (error: any) {
      logger.error('[TranscriptionService] Error processing audio chunk', error, {
        sessionId
      })
      return null
    }
  }

  /**
   * Handle WebSocket connection
   */
  handleWebSocketConnection(ws: WebSocket, sessionId: string) {
    logger.info('[TranscriptionService] WebSocket connected', { sessionId })

    // Store connection
    const socket = ws as WebSocketLike
    this.activeConnections.set(sessionId, socket)

    // Send existing transcription buffer
    const buffer = this.transcriptionBuffer.get(sessionId) || []
    if (buffer.length > 0) {
      socket.send(JSON.stringify({
        type: 'transcription_history',
        data: buffer
      }))
    }

    const handleMessagePayload = async (payload: unknown) => {
      try {
        const dataString = this.extractMessageString(payload)
        if (!dataString) return

        const message = JSON.parse(dataString)

        switch (message.type) {
          case 'audio_chunk':
            if (message.audioData) {
              const audioBuffer = base64ToArrayBuffer(message.audioData)
              await this.processAudioChunk(sessionId, audioBuffer, message.options)
            }
            break
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong' }))
            break
          case 'clear_buffer':
            this.transcriptionBuffer.set(sessionId, [])
            socket.send(JSON.stringify({ type: 'buffer_cleared' }))
            break
        }
      } catch (error: any) {
        logger.error('[TranscriptionService] WebSocket message error', error, {
          sessionId
        })
      }
    }

    if (typeof socket.on === 'function') {
      const handleMessage = (payload: unknown) => {
        void handleMessagePayload(payload)
      }

      socket.on('message', handleMessage)
      socket.on('close', () => {
        logger.info('[TranscriptionService] WebSocket disconnected', { sessionId })
        this.activeConnections.delete(sessionId)
      })
      socket.on('error', (error: unknown) => {
        logger.error('[TranscriptionService] WebSocket error', error, { sessionId })
        this.activeConnections.delete(sessionId)
      })
    } else {
      socket.addEventListener?.('message', ((event: MessageEvent) => {
        void handleMessagePayload(event.data)
      }) as WebSocketListener)
      socket.addEventListener?.('close', (() => {
        logger.info('[TranscriptionService] WebSocket disconnected', { sessionId })
        this.activeConnections.delete(sessionId)
      }) as WebSocketListener)
      socket.addEventListener?.('error', ((event: Event) => {
        logger.error('[TranscriptionService] WebSocket error', event, { sessionId })
        this.activeConnections.delete(sessionId)
      }) as WebSocketListener)
    }
  }

  /**
   * Broadcast transcription chunk to session
   */
  private broadcastToSession(sessionId: string, chunk: TranscriptionChunk) {
    const ws = this.activeConnections.get(sessionId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'transcription_chunk',
        data: chunk
      }))
    }
  }

  /**
   * Get transcription history for session
   */
  getTranscriptionHistory(sessionId: string): TranscriptionChunk[] {
    return this.transcriptionBuffer.get(sessionId) || []
  }

  /**
   * Get full transcription text for session
   */
  getFullTranscription(sessionId: string): string {
    const chunks = this.transcriptionBuffer.get(sessionId) || []
    return chunks
      .filter(chunk => chunk.isFinal)
      .map(chunk => chunk.text)
      .join(' ')
  }

  /**
   * Clear transcription buffer for session
   */
  clearSession(sessionId: string) {
    this.transcriptionBuffer.delete(sessionId)
    
    const ws = this.activeConnections.get(sessionId)
    if (ws) {
      ws.close()
      this.activeConnections.delete(sessionId)
    }

    logger.info('[TranscriptionService] Session cleared', { sessionId })
  }

  private extractMessageString(payload: unknown): string | null {
    if (typeof payload === 'string') {
      return payload
    }

    if (payload instanceof ArrayBuffer) {
      return new TextDecoder().decode(payload)
    }

    if (ArrayBuffer.isView(payload)) {
      const view = payload as ArrayBufferView
      const uint = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
      return new TextDecoder().decode(uint)
    }

    if (payload && typeof payload === 'object' && 'data' in payload) {
      const nested = (payload as { data: unknown }).data
      return this.extractMessageString(nested)
    }

    if (payload && typeof (payload as { toString?: () => string }).toString === 'function') {
      return (payload as { toString: () => string }).toString()
    }

    return null
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeConnections.keys())
  }

  /**
   * Get service statistics
   */
  getStats(): {
    activeSessions: number
    totalChunks: number
    averageConfidence: number
  } {
    const activeSessions = this.activeConnections.size
    let totalChunks = 0
    let totalConfidence = 0

    for (const chunks of this.transcriptionBuffer.values()) {
      totalChunks += chunks.length
      totalConfidence += chunks.reduce((sum, chunk) => sum + chunk.confidence, 0)
    }

    return {
      activeSessions,
      totalChunks,
      averageConfidence: totalChunks > 0 ? totalConfidence / totalChunks : 0
    }
  }
}

// Export singleton instance
export const transcriptionService = RealTimeTranscriptionService.getInstance()
