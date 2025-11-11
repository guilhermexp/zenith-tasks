'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { MindFlowItem } from '@/types';

// Icons
const MicIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const StopCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <rect width="6" height="6" x="9" y="9" />
  </svg>
);

const SaveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const Trash2Icon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

interface MeetingPageProps {
  items: MindFlowItem[];
  onAddMeeting: (meeting: Partial<MindFlowItem>) => Promise<MindFlowItem | null>;
}

export const MeetingPage: React.FC<MeetingPageProps> = ({ items, onAddMeeting }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [insights, setInsights] = useState<{
    summary: string;
    actionItems: string[];
    participants: string[];
    topics: string[];
  } | null>(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Format recording time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // Start recording
  const handleStartRecording = async () => {
    try {
      setError(null);
      console.log('[MeetingPage] Requesting microphone access...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      console.log('[MeetingPage] Microphone access granted');

      // Try to get best audio format
      const options = { mimeType: 'audio/webm;codecs=opus' };
      let mediaRecorder: MediaRecorder;

      try {
        mediaRecorder = new MediaRecorder(stream, options);
        console.log('[MeetingPage] Using audio/webm;codecs=opus');
      } catch (e) {
        console.log('[MeetingPage] Falling back to default audio format');
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('[MeetingPage] Audio chunk received:', event.data.size, 'bytes');
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        console.log('[MeetingPage] Recording stopped. Total size:', audioBlob.size, 'bytes, Type:', audioBlob.type);
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('[MeetingPage] MediaRecorder error:', event);
        setError('Erro durante gravação. Tente novamente.');
      };

      // Start recording with timeslice for continuous data
      mediaRecorder.start(1000); // Collect data every 1 second
      console.log('[MeetingPage] Recording started');
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err: any) {
      console.error('[MeetingPage] Failed to start recording:', err);
      setError(`Não foi possível acessar o microfone: ${err.message}`);
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Transcribe audio
  const handleTranscribe = async () => {
    if (!audioBlob) {
      console.error('[MeetingPage] No audio blob to transcribe');
      return;
    }

    // Validate audio size
    if (audioBlob.size < 1000) {
      setError('Áudio muito curto. Grave por pelo menos 2 segundos.');
      console.error('[MeetingPage] Audio too short:', audioBlob.size, 'bytes');
      return;
    }

    console.log('[MeetingPage] Starting transcription...', {
      size: audioBlob.size,
      type: audioBlob.type,
    });

    setIsTranscribing(true);
    setError(null);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);

      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          console.log('[MeetingPage] Audio converted to base64, length:', base64.length);
          resolve(base64);
        };
        reader.onerror = (error) => {
          console.error('[MeetingPage] FileReader error:', error);
          reject(error);
        };
      });

      console.log('[MeetingPage] Calling transcription API...');

      // Call transcription API
      const response = await fetch('/api/speech/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType: audioBlob.type || 'audio/webm',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[MeetingPage] Transcription API error:', errorData);
        throw new Error(errorData.error || 'Falha ao transcrever áudio');
      }

      const data = await response.json();
      const transcribedText = data.text || data.transcript || '';

      console.log('[MeetingPage] Transcription received:', transcribedText.substring(0, 100));
      setTranscription(transcribedText);

      if (!transcribedText) {
        setError('Transcrição vazia. Tente falar mais alto ou verificar o microfone.');
        return;
      }

      // Auto-analyze after transcription
      await handleAnalyze(transcribedText);
    } catch (err: any) {
      console.error('[MeetingPage] Transcription error:', err);
      setError(err.message || 'Erro ao transcrever áudio');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Analyze transcription with AI
  const handleAnalyze = async (text?: string) => {
    const textToAnalyze = text || transcription;
    if (!textToAnalyze) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Analise esta transcrição de reunião e forneça:
1. Um resumo conciso (2-3 frases)
2. Lista de action items identificados
3. Participantes mencionados
4. Principais tópicos discutidos

Transcrição:
${textToAnalyze}

Responda em formato JSON com as chaves: summary, actionItems (array), participants (array), topics (array).`,
          context: 'analysis',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao analisar transcrição');
      }

      const data = await response.json();
      const content = data.response || '';

      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setInsights({
          summary: parsed.summary || '',
          actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
          participants: Array.isArray(parsed.participants) ? parsed.participants : [],
          topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        });

        // Auto-generate title from first topic or summary
        if (!meetingTitle && (parsed.topics?.[0] || parsed.summary)) {
          const autoTitle = parsed.topics?.[0] || parsed.summary.split('.')[0];
          setMeetingTitle(autoTitle.substring(0, 100));
        }
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Erro ao analisar transcrição');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save meeting
  const handleSaveMeeting = async () => {
    if (!transcription || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      const meeting: Partial<MindFlowItem> = {
        title: meetingTitle || `Reunião ${new Date().toLocaleDateString()}`,
        type: 'Reunião',
        completed: false,
        summary: insights?.summary || '',
        transcript: {
          text: transcription,
          timestamp: new Date().toISOString(),
        },
        meetingDetails: {
          duration: recordingTime,
          recordedAt: new Date().toISOString(),
          actionItems: insights?.actionItems || [],
          participants: insights?.participants || [],
          topics: insights?.topics || [],
        },
      };

      await onAddMeeting(meeting);

      // Reset form
      handleDiscard();
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message || 'Erro ao salvar reunião');
    } finally {
      setIsSaving(false);
    }
  };

  // Discard recording
  const handleDiscard = () => {
    setAudioBlob(null);
    setTranscription('');
    setInsights(null);
    setMeetingTitle('');
    setRecordingTime(0);
    setError(null);
  };

  // Auto-transcribe when recording stops
  useEffect(() => {
    if (audioBlob && !transcription && !isTranscribing) {
      handleTranscribe();
    }
  }, [audioBlob]);

  // Get past meetings
  const meetings = items.filter((item) => item.type === 'Reunião');

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
      {/* Header */}
      <div className="border-b border-neutral-800/50 bg-neutral-900/30 backdrop-blur-sm">
        <div className="px-4 py-3">
          <h1 className="text-sm font-semibold text-neutral-100">Reuniões</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Grave e transcreva reuniões com IA
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Recording Interface */}
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-lg p-4">
          <div className="flex flex-col items-center gap-4">
            {/* Recording Status */}
            {isRecording && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-neutral-300">Gravando</span>
                <span className="text-sm font-mono text-neutral-400">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}

            {!isRecording && recordingTime > 0 && !audioBlob && (
              <div className="text-sm text-neutral-400">
                Gravação finalizada: {formatTime(recordingTime)}
              </div>
            )}

            {/* Recording Button */}
            {!audioBlob && (
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isTranscribing}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/50'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {isRecording ? (
                  <>
                    <StopCircleIcon className="w-4 h-4" />
                    <span>Parar Gravação</span>
                  </>
                ) : (
                  <>
                    <MicIcon className="w-4 h-4" />
                    <span>Iniciar Gravação</span>
                  </>
                )}
              </button>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex flex-col gap-2 w-full max-w-md">
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                  {error}
                </div>
                {audioBlob && error.includes('transcrever') && (
                  <button
                    onClick={() => {
                      setError(null);
                      handleTranscribe();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/50 text-xs font-medium transition-colors"
                  >
                    Tentar Novamente
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Transcription & Analysis */}
        {(isTranscribing || transcription) && (
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-lg p-4 space-y-3">
            {/* Title Input */}
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">
                Título da Reunião
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Ex: Reunião de planejamento Q1"
                className="w-full px-3 py-2 bg-neutral-800/60 border border-neutral-700/50 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              />
            </div>

            {/* Debug Info */}
            {audioBlob && (
              <div className="bg-neutral-800/40 border border-neutral-700/50 rounded-lg p-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs text-neutral-500">
                    Áudio: {(audioBlob.size / 1024).toFixed(1)} KB • {audioBlob.type} • {formatTime(recordingTime)}
                  </div>
                  <div className="flex items-center gap-2">
                    {!transcription && !isTranscribing && (
                      <button
                        onClick={() => {
                          setError(null);
                          handleTranscribe();
                        }}
                        className="text-xs text-neutral-400 hover:text-neutral-200 underline"
                      >
                        Transcrever manualmente
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const url = URL.createObjectURL(audioBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `reuniao-${Date.now()}.webm`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="text-xs text-neutral-400 hover:text-neutral-200 underline"
                    >
                      Baixar áudio
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Transcription */}
            <div>
              <div className="flex items-center gap-2 mb-2 border-b border-neutral-700/50 pb-2">
                <div className="w-1 h-4 bg-neutral-600 rounded-full" />
                <h3 className="text-xs font-semibold text-neutral-200">
                  Transcrição Bruta
                </h3>
                {isTranscribing && (
                  <div className="w-3 h-3 border-2 border-neutral-600 border-t-neutral-400 rounded-full animate-spin" />
                )}
                {transcription && (
                  <span className="text-xs text-neutral-500 ml-auto">
                    {transcription.length} caracteres
                  </span>
                )}
              </div>
              <div className="bg-neutral-800/60 border border-neutral-700/50 rounded-lg p-3 min-h-[120px] max-h-[250px] overflow-y-auto">
                <p className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {isTranscribing ? (
                    <span className="text-neutral-500">Transcrevendo áudio com Whisper...</span>
                  ) : transcription ? (
                    transcription
                  ) : (
                    <span className="text-neutral-500">Aguardando transcrição...</span>
                  )}
                </p>
              </div>
            </div>

            {/* Insights */}
            {(isAnalyzing || insights) && (
              <div>
                <div className="flex items-center gap-2 mb-2 border-b border-neutral-700/50 pb-2">
                  <SparklesIcon className="w-3.5 h-3.5 text-neutral-400" />
                  <h3 className="text-xs font-semibold text-neutral-200">
                    Análise Inteligente
                  </h3>
                  {isAnalyzing && (
                    <div className="w-3 h-3 border-2 border-neutral-600 border-t-neutral-400 rounded-full animate-spin" />
                  )}
                </div>

                {insights && (
                  <div className="space-y-2">
                    {/* Summary */}
                    {insights.summary && (
                      <div className="bg-neutral-800/60 border border-neutral-700/50 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-neutral-300 mb-1">
                          Resumo
                        </h4>
                        <p className="text-xs text-neutral-400">
                          {insights.summary}
                        </p>
                      </div>
                    )}

                    {/* Action Items */}
                    {insights.actionItems.length > 0 && (
                      <div className="bg-neutral-800/60 border border-neutral-700/50 rounded-lg p-3">
                        <h4 className="text-xs font-semibold text-neutral-300 mb-2">
                          Action Items
                        </h4>
                        <ul className="space-y-1">
                          {insights.actionItems.map((item, index) => (
                            <li
                              key={index}
                              className="text-xs text-neutral-400 flex items-start gap-2"
                            >
                              <span className="text-neutral-500">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Topics & Participants */}
                    <div className="grid grid-cols-2 gap-2">
                      {insights.topics.length > 0 && (
                        <div className="bg-neutral-800/60 border border-neutral-700/50 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-neutral-300 mb-2">
                            Tópicos
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {insights.topics.map((topic, index) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 bg-neutral-700/50 text-neutral-300 text-xs rounded"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {insights.participants.length > 0 && (
                        <div className="bg-neutral-800/60 border border-neutral-700/50 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-neutral-300 mb-2">
                            Participantes
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {insights.participants.map((participant, index) => (
                              <span
                                key={index}
                                className="px-2 py-0.5 bg-neutral-700/50 text-neutral-300 text-xs rounded"
                              >
                                {participant}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSaveMeeting}
                disabled={!transcription || isTranscribing || isAnalyzing || isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-700 border border-neutral-600 text-neutral-100 hover:bg-neutral-600 hover:text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-neutral-400 border-t-neutral-100 rounded-full animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <SaveIcon className="w-3.5 h-3.5" />
                    <span>Salvar Reunião</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDiscard}
                disabled={isTranscribing || isAnalyzing || isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2Icon className="w-3.5 h-3.5" />
                <span>Descartar</span>
              </button>
            </div>
          </div>
        )}

        {/* Past Meetings */}
        {meetings.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Reuniões Anteriores
            </h3>
            <div className="space-y-2">
              {meetings.slice(0, 5).map((meeting) => (
                <div
                  key={meeting.id}
                  className="bg-neutral-900/40 border border-neutral-800/50 rounded-lg p-3 hover:bg-neutral-900/60 transition-colors cursor-pointer"
                >
                  <h4 className="text-sm text-neutral-100 mb-1">
                    {meeting.title}
                  </h4>
                  {meeting.summary && (
                    <p className="text-xs text-neutral-400 line-clamp-2">
                      {meeting.summary}
                    </p>
                  )}
                  {meeting.meetingDetails?.recordedAt && (
                    <p className="text-xs text-neutral-500 mt-1">
                      {new Date(meeting.meetingDetails.recordedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingPage;
