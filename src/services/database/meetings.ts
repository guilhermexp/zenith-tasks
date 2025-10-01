/**
 * Meeting database operations
 */

import { createClient } from '@supabase/supabase-js'

import type { ChatBubble, MeetingDetails, MindFlowItem } from '@/types'
import { blobToBase64 } from '@/utils/base64'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Meeting storage service
 */
export class MeetingStorageService {
  private supabase: any

  constructor() {
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    }
  }

  /**
   * Store meeting audio
   */
  async storeAudio(audioBlob: Blob, meetingId: string): Promise<string | null> {
    if (!this.supabase) {
      // Fallback to local storage
      return this.storeAudioLocally(audioBlob, meetingId)
    }

    try {
      const fileName = `meeting_${meetingId}_${Date.now()}.webm`

      const { data, error } = await this.supabase.storage
        .from('meeting-audios')
        .upload(fileName, audioBlob, {
          contentType: audioBlob.type || 'audio/webm'
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from('meeting-audios')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Error storing audio:', error)
      return this.storeAudioLocally(audioBlob, meetingId)
    }
  }

  /**
   * Store audio locally as base64
   */
  private async storeAudioLocally(audioBlob: Blob, meetingId: string): Promise<string> {
    const base64 = await blobToBase64(audioBlob)
    const dataUrl = `data:${audioBlob.type || 'audio/webm'};base64,${base64}`

    // Store in localStorage when available (client-side only)
    const key = `meeting_audio_${meetingId}`
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, dataUrl)
      }
    } catch (e) {
      console.error('Failed to store audio locally:', e)
    }

    return dataUrl
  }

  /**
   * Store meeting transcript
   */
  async storeTranscript(
    meetingId: string,
    transcript: ChatBubble[]
  ): Promise<boolean> {
    if (!this.supabase) {
      return this.storeTranscriptLocally(meetingId, transcript)
    }

    try {
      const { error } = await this.supabase
        .from('meeting_transcripts')
        .upsert({
          meeting_id: meetingId,
          transcript,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error storing transcript:', error)
      return this.storeTranscriptLocally(meetingId, transcript)
    }
  }

  /**
   * Store transcript locally
   */
  private storeTranscriptLocally(meetingId: string, transcript: ChatBubble[]): boolean {
    const key = `meeting_transcript_${meetingId}`
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(transcript))
      }
      return true
    } catch (e) {
      console.error('Failed to store transcript locally:', e)
      return false
    }
  }

  /**
   * Create meeting summary with AI
   */
  async createMeetingSummary(
    transcript: ChatBubble[],
    context?: { title?: string; participants?: string[] }
  ): Promise<MeetingDetails> {
    try {
      // Convert transcript to text
      const transcriptText = transcript
        .map(bubble => `${bubble.speaker}: ${bubble.text}`)
        .join('\n')

      // Call AI to generate summary
      const response = await fetch('/api/meetings/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptText,
          context
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const { summary } = await response.json()
      return summary
    } catch (error) {
      console.error('Error creating meeting summary:', error)

      // Fallback summary
      return {
        summary: 'Resumo da reunião não disponível',
        topics: [{
          title: 'Transcrição',
          content: transcript.map(b => `${b.speaker}: ${b.text}`).join('\n')
        }],
        actionItems: []
      }
    }
  }

  /**
   * Get meeting history
   */
  async getMeetingHistory(limit = 10): Promise<MindFlowItem[]> {
    if (!this.supabase) {
      return this.getMeetingHistoryLocally(limit)
    }

    try {
      const { data, error } = await this.supabase
        .from('items')
        .select('*')
        .eq('type', 'Reunião')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error getting meeting history:', error)
      return this.getMeetingHistoryLocally(limit)
    }
  }

  /**
   * Get meeting history from localStorage
   */
  private getMeetingHistoryLocally(limit: number): MindFlowItem[] {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return []
      }

      const itemsJson = window.localStorage.getItem('mindflow-items')
      if (!itemsJson) return []

      const items: MindFlowItem[] = JSON.parse(itemsJson)
      return items
        .filter(item => item.type === 'Reunião')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
    } catch (e) {
      console.error('Failed to get meeting history locally:', e)
      return []
    }
  }

  /**
   * Delete meeting and associated data
   */
  async deleteMeeting(meetingId: string): Promise<boolean> {
    if (!this.supabase) {
      return this.deleteMeetingLocally(meetingId)
    }

    try {
      // Delete from database
      const { error } = await this.supabase
        .from('items')
        .delete()
        .eq('id', meetingId)

      if (error) throw error

      // Delete audio if exists
      await this.supabase.storage
        .from('meeting-audios')
        .remove([`meeting_${meetingId}*.webm`])

      // Delete transcript
      await this.supabase
        .from('meeting_transcripts')
        .delete()
        .eq('meeting_id', meetingId)

      return true
    } catch (error) {
      console.error('Error deleting meeting:', error)
      return this.deleteMeetingLocally(meetingId)
    }
  }

  /**
   * Delete meeting locally
   */
  private deleteMeetingLocally(meetingId: string): boolean {
    try {
      // Remove audio
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(`meeting_audio_${meetingId}`)

        // Remove transcript
        window.localStorage.removeItem(`meeting_transcript_${meetingId}`)

        // Remove from items
        const itemsJson = window.localStorage.getItem('mindflow-items')
        if (itemsJson) {
          const items: MindFlowItem[] = JSON.parse(itemsJson)
          const filtered = items.filter(item => item.id !== meetingId)
          window.localStorage.setItem('mindflow-items', JSON.stringify(filtered))
        }
      }

      return true
    } catch (e) {
      console.error('Failed to delete meeting locally:', e)
      return false
    }
  }
}

// Singleton instance
let meetingStorageInstance: MeetingStorageService | null = null

export const getMeetingStorage = (): MeetingStorageService => {
  if (!meetingStorageInstance) {
    meetingStorageInstance = new MeetingStorageService()
  }
  return meetingStorageInstance
}
