'use client';

import React, { useState, useMemo } from 'react';

import type { MindFlowItem, ChatBubble, MeetingDetails } from '../types';
import AudioRecorder from './AudioRecorder';
import {
  SendIcon, XIcon
} from './Icons';
import { getMeetingStorage } from '../services/database/meetings';

interface MeetingPageProps {
  items: MindFlowItem[];
  onSelectItem: (item: MindFlowItem) => void;
  onUpdateItem: (itemId: string, updates: Partial<MindFlowItem>) => void;
  onCreateMeetingNote: (transcript: ChatBubble[], details: MeetingDetails) => Promise<MindFlowItem>;
  onDeleteItem: (itemId: string) => void;
}

const MeetingPage: React.FC<MeetingPageProps> = ({
  items,
  onSelectItem,
  onUpdateItem,
  onCreateMeetingNote,
  onDeleteItem
}) => {
  const [selectedMeeting, setSelectedMeeting] = useState<MindFlowItem | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showRecorder, setShowRecorder] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Get meeting items from real data only
  const meetingItems = useMemo(() => {
    const meetings = items.filter(item => item.type === 'Reunião');
    return meetings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items]);

  // Auto-select first meeting
  React.useEffect(() => {
    if (meetingItems.length > 0 && !selectedMeeting) {
      setSelectedMeeting(meetingItems[0]);
    }
  }, [meetingItems, selectedMeeting]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedMeeting) return;

    const newBubble: ChatBubble = {
      speaker: 'Você',
      text: newMessage,
      isCurrentUser: true
    };

    const updatedTranscript = [...(selectedMeeting.transcript || []), newBubble];

    onUpdateItem(selectedMeeting.id, {
      transcript: updatedTranscript
    });

    setNewMessage('');
  };

  // Handle audio recording
  const handleAudioReady = async (audioBlob: Blob) => {
    if (!selectedMeeting) return;

    setIsTranscribing(true);
    const meetingStorage = getMeetingStorage();

    try {
      // Store audio
      const audioUrl = await meetingStorage.storeAudio(audioBlob, selectedMeeting.id);

      // Create FormData for API
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Send to transcription API
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erro na transcrição');
      }

      const { transcript } = await response.json();

      if (transcript) {
        const newBubble: ChatBubble = {
          speaker: 'Áudio Transcrito',
          text: transcript,
          isCurrentUser: false
        };

        const updatedTranscript = [...(selectedMeeting.transcript || []), newBubble];

        // Store transcript
        await meetingStorage.storeTranscript(selectedMeeting.id, updatedTranscript);

        // Update item
        onUpdateItem(selectedMeeting.id, {
          transcript: updatedTranscript
        });

        // Generate summary if transcript has enough content
        if (updatedTranscript.length >= 3) {
          const meetingDetails = await meetingStorage.createMeetingSummary(
            updatedTranscript,
            { title: selectedMeeting.title }
          );

          onUpdateItem(selectedMeeting.id, {
            meetingDetails
          });
        }
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  if (!selectedMeeting) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-950 md:rounded-lg md:border md:border-neutral-800">
        <p className="text-neutral-500">Nenhuma reunião encontrada</p>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-neutral-950 md:rounded-lg md:border md:border-neutral-800">
      {/* Main Content - Meeting Details */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">M</span>
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-300">Meeting transcript</p>
                <p className="text-xs text-neutral-500">qua., jul. 2 • 2:11 PM • 34 minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-neutral-400">
              <button className="px-3 py-1 text-xs bg-neutral-800 rounded-md hover:bg-neutral-700 transition-colors">
                Private
              </button>
              <button className="px-3 py-1 text-xs bg-neutral-800 rounded-md hover:bg-neutral-700 transition-colors">
                Share
              </button>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">{selectedMeeting.title}</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto overscroll-contain">
          <div className="p-6 space-y-8">
            {selectedMeeting.meetingDetails && (
              <>
                {/* Summary */}
                {selectedMeeting.meetingDetails.summary && (
                  <div>
                    <p className="text-neutral-300 leading-relaxed text-base">
                      {selectedMeeting.meetingDetails.summary}
                    </p>
                  </div>
                )}

                {/* Topics */}
                {selectedMeeting.meetingDetails.topics.map((topic, index) => (
                  <div key={index} className="space-y-4">
                    <h2 className="text-xl font-bold text-white">{topic.title}</h2>
                    <div className="text-neutral-300 space-y-3">
                      {topic.content.split('\n').map((line, lineIndex) => (
                        <p key={lineIndex} className="leading-relaxed">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          
          {/* Removed inline AI ask button: using global AI component instead */}
        </div>
      </div>

      {/* Right Panel - Chat */}
      <div className="w-96 border-l border-neutral-800 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">Meeting transcript</h3>
            <p className="text-xs text-neutral-400">qua., jul. 2 • 2:11 PM • 34 minutes</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRecorder(!showRecorder)}
              className={`p-1.5 rounded-md transition-colors ${
                showRecorder
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
              title={showRecorder ? 'Fechar gravador' : 'Abrir gravador'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            <button className="p-1 text-neutral-400 hover:text-white">
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Audio Recorder */}
        {showRecorder && (
          <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
            <AudioRecorder
              onAudioReady={handleAudioReady}
              isTranscribing={isTranscribing}
            />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-auto overscroll-contain p-4 space-y-3">
          {selectedMeeting.transcript?.map((bubble, index) => (
            <div key={index} className="space-y-1">
              <p className={`text-xs ${bubble.isCurrentUser ? 'text-neutral-300' : 'text-neutral-500'}`}>
                {bubble.speaker}
              </p>
              <div className={`p-3 rounded-lg text-sm ${
                bubble.isCurrentUser 
                  ? 'bg-neutral-900/40 border border-neutral-800/50 text-neutral-200 ml-8' 
                  : 'bg-neutral-800 text-neutral-200 mr-8'
              }`}>
                {bubble.text}
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-neutral-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Digite sua mensagem..."
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/50"
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="p-2 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-200 rounded-lg transition-colors"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingPage;
