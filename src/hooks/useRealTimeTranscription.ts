/**
 * Hook for real-time transcription functionality
 */

import { useState, useRef, useCallback, useEffect } from 'react'

import { transcriptionService, TranscriptionChunk } from '@/services/streaming/transcription-service'
import { blobToBase64 } from '@/utils/base64'

export interface UseRealTimeTranscriptionOptions {
  sessionId?: string
  autoStart?: boolean
  chunkInterval?: number // milliseconds
  onTranscriptionUpdate?: (text: string) => void
  onError?: (error: string) => void
}

export interface UseRealTimeTranscriptionReturn {
  isRecording: boolean
  isTranscribing: boolean
  transcription: string
  chunks: TranscriptionChunk[]
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  clearTranscription: () => void
  confidence: number
}

export function useRealTimeTranscription(
  options: UseRealTimeTranscriptionOptions = {}
): UseRealTimeTranscriptionReturn {
  const {
    sessionId = `session_${Date.now()}`,
    autoStart = false,
    chunkInterval = 2000,
    onTranscriptionUpdate,
    onError
  } = options

  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcription, setTranscription] = useState('')
  const [chunks, setChunks] = useState<TranscriptionChunk[]>([])
  const [error, setError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const websocketRef = useRef<WebSocket | null>(null)

  // Initialize WebSocket connection
  const initializeWebSocket = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/transcription/ws?sessionId=${sessionId}`

      // For now, we'll use polling instead of WebSocket since Next.js doesn't support WebSocket out of the box
      // In production, you would use a proper WebSocket server
      void wsUrl
      return true
    } catch (err: any) {
      setError(`WebSocket connection failed: ${err.message}`)
      onError?.(err.message)
      return false
    }
  }, [sessionId, onError])

  // Process audio chunk
  const processAudioChunk = useCallback(async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true)

      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob)

      // Send to transcription API
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: audioBlob.type || 'audio/webm',
          sessionId,
          realTime: true
        })
      })

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`)
      }

      const result = await response.json()

      if (result.text) {
        const chunk: TranscriptionChunk = {
          text: result.text,
          confidence: result.confidence || 0.8,
          isFinal: result.isFinal || false,
          timestamp: result.timestamp || Date.now(),
          speaker: result.speaker
        }

        setChunks(prev => {
          const updated = [...prev, chunk]

          // Update confidence (average of last 5 chunks)
          const recentChunks = updated.slice(-5)
          const totalConfidence = recentChunks.reduce((sum, c) => sum + c.confidence, 0)
          const avgConfidence = recentChunks.length ? totalConfidence / recentChunks.length : chunk.confidence
          setConfidence(avgConfidence)

          return updated
        })

        // Update full transcription
        setTranscription(prev => {
          const newText = prev ? `${prev} ${chunk.text}` : chunk.text
          onTranscriptionUpdate?.(newText)
          return newText
        })
      }
    } catch (err: any) {
      const errorMsg = `Transcription error: ${err.message}`
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setIsTranscribing(false)
    }
  }, [sessionId, onTranscriptionUpdate, onError])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null)

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      })

      streamRef.current = stream

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      })

      mediaRecorderRef.current = mediaRecorder

      let audioChunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: mimeType })
          processAudioChunk(audioBlob)
          audioChunks = []
        }
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)

      // Set up interval to collect chunks
      intervalRef.current = setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
          mediaRecorder.start() // Restart for next chunk
        }
      }, chunkInterval)

      // Initialize WebSocket (for future use)
      initializeWebSocket()

    } catch (err: any) {
      const errorMsg = `Failed to start recording: ${err.message}`
      setError(errorMsg)
      onError?.(errorMsg)
    }
  }, [chunkInterval, processAudioChunk, initializeWebSocket, onError])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (websocketRef.current) {
      websocketRef.current.close()
      websocketRef.current = null
    }
  }, [isRecording])

  // Clear transcription
  const clearTranscription = useCallback(() => {
    setTranscription('')
    setChunks([])
    setError(null)
    setConfidence(0)
  }, [])

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      startRecording()
    }

    return () => {
      stopRecording()
    }
  }, [autoStart, startRecording, stopRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [stopRecording])

  return {
    isRecording,
    isTranscribing,
    transcription,
    chunks,
    error,
    startRecording,
    stopRecording,
    clearTranscription,
    confidence
  }
}
