'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface AudioRecorderProps {
  onAudioReady: (audioBlob: Blob) => void;
  onTranscriptionUpdate?: (text: string) => void;
  isTranscribing?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioReady,
  onTranscriptionUpdate,
  isTranscribing = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
  }, [audioURL]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      streamRef.current = stream;

      // Create MediaRecorder with best supported format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        onAudioReady(audioBlob);
        setIsProcessing(false);
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Erro ao acessar microfone');
      console.error('Error starting recording:', err);
    }
  }, [onAudioReady]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      setIsProcessing(true);
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [isRecording]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Clear recording
  const clearRecording = useCallback(() => {
    setAudioURL(null);
    setRecordingTime(0);
    setError(null);
    chunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div className="flex flex-col gap-4">
      {/* Recording Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleRecording}
          disabled={isProcessing || isTranscribing}
          className={`p-3 rounded-full transition-all duration-200 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-neutral-700 hover:bg-neutral-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isRecording ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <rect x="6" y="6" width="8" height="8" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" />
            </svg>
          )}
        </button>

        {/* Timer Display */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-neutral-300">
            {formatTime(recordingTime)}
          </span>
          {isRecording && (
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse delay-100"></div>
              <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse delay-200"></div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="flex-1">
          {isRecording && (
            <span className="text-xs text-red-400">Gravando...</span>
          )}
          {isProcessing && (
            <span className="text-xs text-yellow-400">Processando...</span>
          )}
          {isTranscribing && (
            <span className="text-xs text-blue-400">Transcrevendo...</span>
          )}
          {audioURL && !isRecording && !isProcessing && !isTranscribing && (
            <span className="text-xs text-green-400">Áudio pronto</span>
          )}
        </div>

        {/* Clear Button */}
        {audioURL && !isRecording && (
          <button
            onClick={clearRecording}
            className="px-3 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors text-neutral-300"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Audio Playback */}
      {audioURL && !isRecording && (
        <div className="p-3 bg-neutral-800 rounded-lg">
          <audio
            controls
            src={audioURL}
            className="w-full h-8"
            style={{ filter: 'invert(1)' }}
          />
        </div>
      )}

      {/* Transcription Display */}
      {onTranscriptionUpdate && (
        <div className="p-3 bg-neutral-800 rounded-lg min-h-[100px]">
          <p className="text-xs text-neutral-400 mb-2">Transcrição ao vivo:</p>
          <p className="text-sm text-neutral-200">
            {isTranscribing ? 'Processando áudio...' : 'Aguardando gravação...'}
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !audioURL && (
        <div className="p-3 bg-neutral-800/50 rounded-lg">
          <p className="text-xs text-neutral-400">
            Clique no botão de gravação para começar. A transcrição será processada automaticamente.
          </p>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;