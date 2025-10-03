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
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showRecorder, setShowRecorder] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Get meeting items from real data only
  const meetingItems = useMemo(() => {
    const meetings = items.filter(item => item.type === 'Reunião');
    return meetings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items]);

  // Auto-select first meeting or keep selection in sync
  React.useEffect(() => {
    if (meetingItems.length === 0) {
      setSelectedMeetingId(null);
      return;
    }
    if (!selectedMeetingId || !meetingItems.some(item => item.id === selectedMeetingId)) {
      setSelectedMeetingId(meetingItems[0].id);
    }
  }, [meetingItems, selectedMeetingId]);

  const selectedMeeting = useMemo(() => {
    return meetingItems.find(item => item.id === selectedMeetingId) || null;
  }, [meetingItems, selectedMeetingId]);

  React.useEffect(() => {
    if (selectedMeeting) {
      onSelectItem(selectedMeeting);
    }
  }, [selectedMeeting, onSelectItem]);

  React.useEffect(() => {
    if (!selectedMeeting) {
      setShowRecorder(false);
    }
  }, [selectedMeeting]);

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

  const handleCreateMeeting = async () => {
    try {
      const details: MeetingDetails = {
        summary: '',
        topics: [],
        actionItems: [],
        participants: [],
        decisions: [],
        nextSteps: [],
        startTime: new Date().toISOString()
      };
      const created = await onCreateMeetingNote([], details);
      if (created?.id) {
        setSelectedMeetingId(created.id);
      }
    } catch (error) {
      console.error('Failed to create meeting note:', error);
    }
  };

  const meetingStartISO = selectedMeeting?.meetingDetails?.startTime || selectedMeeting?.createdAt;
  const formattedStart = meetingStartISO
    ? new Date(meetingStartISO).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Data não disponível';
  const meetingDuration = selectedMeeting?.meetingDetails?.duration;
  const participants = selectedMeeting?.meetingDetails?.participants || [];
  const transcript = selectedMeeting?.transcript || [];
  const meetingDetails = selectedMeeting?.meetingDetails;
  const topics = Array.isArray(meetingDetails?.topics) ? meetingDetails.topics : [];
  const actionItems = Array.isArray(meetingDetails?.actionItems) ? meetingDetails.actionItems : [];
  const decisions = Array.isArray(meetingDetails?.decisions) ? meetingDetails.decisions : [];
  const nextSteps = Array.isArray(meetingDetails?.nextSteps) ? meetingDetails.nextSteps : [];

  return (
    <div className="h-full flex bg-neutral-950 md:rounded-lg md:border md:border-neutral-800">
      <aside className="w-72 border-r border-neutral-800 flex flex-col bg-neutral-950/80">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-200">Reuniões</h2>
            <p className="text-xs text-neutral-500">{meetingItems.length} registro(s)</p>
          </div>
          <button
            onClick={handleCreateMeeting}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors"
            title="Criar nova nota de reunião"
          >
            Novo
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {meetingItems.length === 0 ? (
            <div className="p-4 text-xs text-neutral-500">
              Nenhuma reunião registrada ainda.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-900">
              {meetingItems.map(item => {
                const active = item.id === selectedMeetingId;
                const itemDate = item.meetingDetails?.startTime || item.createdAt;
                const label = itemDate ? new Date(itemDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem data';
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setSelectedMeetingId(item.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        active ? 'bg-neutral-900 text-neutral-100' : 'hover:bg-neutral-900/60 text-neutral-300'
                      }`}
                    >
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
                        <span>{label}</span>
                        {item.meetingDetails?.duration && (
                          <span>• {item.meetingDetails.duration}</span>
                        )}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
        {selectedMeeting ? (
          <>
            <div className="p-6 border-b border-neutral-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">M</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-300">Resumo da reunião</p>
                    <p className="text-xs text-neutral-500">
                      {formattedStart}
                      {meetingDuration ? ` • ${meetingDuration}` : ''}
                      {transcript.length ? ` • ${transcript.length} mensagem(ns)` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-neutral-400">
                  <button className="px-3 py-1 text-xs bg-neutral-800 rounded-md hover:bg-neutral-700 transition-colors">
                    Privado
                  </button>
                  <button className="px-3 py-1 text-xs bg-neutral-800 rounded-md hover:bg-neutral-700 transition-colors">
                    Compartilhar
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold text-white flex-1">{selectedMeeting.title}</h1>
                {participants.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p, index) => (
                      <span key={index} className="px-2 py-1 text-xs bg-neutral-800 rounded-full text-neutral-300">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto overscroll-contain">
              <div className="p-6 space-y-8">
                {meetingDetails?.summary && (
                  <section>
                    <p className="text-neutral-300 leading-relaxed text-base">
                      {meetingDetails.summary}
                    </p>
                  </section>
                )}

                {topics.length > 0 && (
                  <section className="space-y-6">
                    {topics.map((topic, index) => (
                      <div key={index} className="space-y-3">
                        <h2 className="text-xl font-semibold text-white">{topic.title}</h2>
                        <div className="text-neutral-300 space-y-2">
                          {topic.content.split('\n').map((line, lineIndex) => (
                            <p key={lineIndex} className="leading-relaxed">
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                )}

                {actionItems.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold text-white mb-3">Ações Pendentes</h2>
                    <ul className="space-y-2">
                      {actionItems.map((action, index) => (
                        <li key={index} className="bg-neutral-900/60 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-300">
                          <p className="font-medium text-neutral-200">{action.task}</p>
                          <div className="text-xs text-neutral-500 flex gap-3 mt-1">
                            {action.responsible && <span>Responsável: {action.responsible}</span>}
                            {action.deadline && <span>Prazo: {action.deadline}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {decisions.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold text-white mb-3">Decisões</h2>
                    <ul className="list-disc pl-5 space-y-1 text-neutral-300 text-sm">
                      {decisions.map((decision, index) => (
                        <li key={index}>{decision}</li>
                      ))}
                    </ul>
                  </section>
                )}

                {nextSteps.length > 0 && (
                  <section>
                    <h2 className="text-lg font-semibold text-white mb-3">Próximos passos</h2>
                    <ul className="list-disc pl-5 space-y-1 text-neutral-300 text-sm">
                      {nextSteps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
              {/* Removed inline AI ask button: using global AI component instead */}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            <p>Selecione uma reunião na lista ao lado para visualizar os detalhes.</p>
          </div>
        )}
      </main>

      <aside className="w-96 border-l border-neutral-800 flex flex-col">
        {selectedMeeting ? (
          <>
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Transcrição</h3>
                <p className="text-xs text-neutral-400">
                  {formattedStart}
                  {meetingDuration ? ` • ${meetingDuration}` : ''}
                  {transcript.length ? ` • ${transcript.length} mensagem(ns)` : ''}
                </p>
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
                <button
                  onClick={() => {
                    if (!selectedMeeting) return;
                    const confirmDelete = window.confirm('Deseja realmente excluir esta reunião?');
                    if (confirmDelete) {
                      onDeleteItem(selectedMeeting.id);
                      setSelectedMeetingId(null);
                    }
                  }}
                  className="p-1 text-neutral-400 hover:text-white"
                  title="Excluir reunião"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {showRecorder && (
              <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
                <AudioRecorder
                  onAudioReady={handleAudioReady}
                  isTranscribing={isTranscribing}
                />
              </div>
            )}

            <div className="flex-1 overflow-auto overscroll-contain p-4 space-y-3">
              {transcript.length === 0 ? (
                <p className="text-xs text-neutral-500">Nenhuma mensagem registrada ainda.</p>
              ) : (
                transcript.map((bubble, index) => (
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
                ))
              )}
            </div>

            <div className="p-4 border-t border-neutral-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm p-6 text-center">
            <p>Selecione uma reunião para visualizar e registrar a transcrição.</p>
          </div>
        )}
      </aside>
    </div>
  );
};

export default MeetingPage;
