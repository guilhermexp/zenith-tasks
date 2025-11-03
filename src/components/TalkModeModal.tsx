'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

import { logger } from '@/utils/logger';

import { MicIcon, SoundWaveIcon, SpinnerIcon, CheckIcon } from './Icons';

interface TalkModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAudioReady: (audioBase64: string, onProgressUpdate: () => void) => Promise<any[]>;
}

type Status = 'idle' | 'permission' | 'recording' | 'transcribing' | 'analyzing' | 'done' | 'error';

const logContext = { component: 'TalkModeModal' } as const;

const TalkModeModal: React.FC<TalkModeModalProps> = ({ isOpen, onClose, onAudioReady }) => {
  const [status, setStatusState] = useState<Status>('idle');
  
  const setStatus = (newStatus: Status) => {
    setStatusState(newStatus);
    statusRef.current = newStatus;
  };
  const [errorMessage, setErrorMessage] = useState('');
  const [createdItems, setCreatedItems] = useState<any[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const statusRef = useRef<Status>('idle');

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const handleFinish = useCallback(async () => {
    if (status !== 'recording') return;
    
    setStatus('transcribing');
    stopRecording();
  }, [status, stopRecording]);

  const startRecording = useCallback(async () => {
    setStatus('permission');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStatus('recording');
      
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.addEventListener('dataavailable', event => {
        audioChunksRef.current.push(event.data);
      });

      recorder.addEventListener('stop', async () => {
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());

        // Process audio if we have chunks
        if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            logger.debug('Audio blob recorded', { size: audioBlob.size, ...logContext });
            
            if (audioBlob.size === 0) {
              logger.warn('Audio blob is empty, closing modal.', logContext);
              onClose();
              return;
            }

            // Only process if we're in the transcribing state (set by handleFinish)
            const currentStatus = statusRef.current;
            logger.debug('Recorder stopped', { currentStatus, ...logContext });
            
            if (currentStatus === 'transcribing' || currentStatus === 'analyzing') {
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                logger.debug('Base64 audio data prepared', { length: base64data.length, ...logContext });
                
                try {
                  const onProgressUpdate = () => {
                    logger.info('Progress update: moving to analyzing', logContext);
                    setStatus('analyzing');
                  };
                  const newItems = await onAudioReady(base64data, onProgressUpdate);
                  setCreatedItems(newItems);
                  setStatus('done');
                  setTimeout(onClose, 2500);
                } catch (e) {
                  logger.error('Error processing audio with Gemini', e, logContext);
                  setErrorMessage(`Erro: ${e instanceof Error ? e.message : 'Não foi possível processar o áudio'}`);
                  setStatus('error');
                }
              };
            }
        }
      });

      recorder.start();

    } catch (err) {
      logger.error('Error accessing microphone', err, logContext);
      setErrorMessage("A permissão para o microfone foi negada. Por favor, habilite nas configurações do seu navegador.");
      setStatus('error');
    }
  }, [onAudioReady, onClose]);

  const handleClose = useCallback(() => {
      stopRecording();
      onClose();
  }, [stopRecording, onClose]);
  
  const handleRetry = () => {
    setErrorMessage('');
    setCreatedItems([]);
    startRecording();
  };

  useEffect(() => {
    if (isOpen) {
      startRecording();
    } else {
      stopRecording();
      setStatus('idle');
      statusRef.current = 'idle';
      setTimeout(() => {
        setErrorMessage('');
        setCreatedItems([]);
      }, 300); // Delay cleanup for exit animation
    }
  }, [isOpen, startRecording, stopRecording]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const renderContent = () => {
    switch (status) {
      case 'error':
        return (
          <>
            <div className="w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center mb-4 border border-red-500/30">
              <MicIcon className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Erro</h2>
            <p className="text-neutral-400 text-center mb-6">{errorMessage}</p>
            <button
              onClick={handleRetry}
              className="bg-neutral-700 hover:bg-neutral-600 text-white font-semibold px-6 py-2 rounded-full transition-colors"
            >
              Tentar Novamente
            </button>
          </>
        );
      case 'recording':
        return (
          <>
            <div className="relative w-20 h-20 flex items-center justify-center mb-4">
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse-slow"></div>
              <div className="w-16 h-16 rounded-full bg-red-500/30 flex items-center justify-center">
                 <SoundWaveIcon className="w-8 h-8 text-red-300" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-white">Gravando...</h2>
            <p className="text-neutral-500 mt-4 text-center min-h-[3rem]">Sinta-se à vontade para falar. Estamos capturando tudo.</p>
          </>
        );
      case 'transcribing':
        return (
          <>
            <div className="w-16 h-16 rounded-full bg-neutral-700 flex items-center justify-center mb-4">
              <SpinnerIcon className="w-8 h-8 text-neutral-300 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-white">Transcrevendo com Gemini...</h2>
            <p className="text-neutral-400 mt-2 text-sm">Aguarde enquanto a IA processa sua gravação.</p>
          </>
        );
      case 'analyzing':
        return (
          <>
            <div className="w-16 h-16 rounded-full bg-neutral-700 flex items-center justify-center mb-4">
              <SpinnerIcon className="w-8 h-8 text-neutral-300 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-white">Analisando sua nota...</h2>
            <p className="text-neutral-400 mt-2 text-sm">A IA está identificando tarefas e ideias.</p>
          </>
        );
      case 'done':
        return (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckIcon className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Itens Criados!</h2>
            <div className="text-neutral-400 text-left text-sm space-y-1">
              {createdItems.map(item => <p key={item.id}>- {item.title} ({item.type})</p>)}
            </div>
          </>
        );
      case 'permission':
      case 'idle':
      default:
        return (
          <>
            <div className="w-16 h-16 rounded-full bg-neutral-700 flex items-center justify-center mb-4">
              <MicIcon className="w-8 h-8 text-neutral-300" />
            </div>
            <h2 className="text-xl font-semibold text-white">Iniciando...</h2>
            <p className="text-neutral-500 mt-2 text-sm">Aguardando permissão do microfone.</p>
          </>
        );
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in-fast" onClick={handleClose}>
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md m-4 shadow-2xl flex flex-col items-center p-8 text-center animate-scale-in" onClick={e => e.stopPropagation()}>
        {renderContent()}
        {status === 'recording' && (
          <button
            onClick={handleFinish}
            className="mt-8 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold px-6 py-2 rounded-full transition-colors"
          >
            Concluir
          </button>
        )}
      </div>
      <style jsx>{`
        @keyframes fade-in-fast {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes scale-in {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse-slow {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 1; }
        }
        .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
        .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
        .animate-pulse-slow { animation: pulse-slow 2s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

export default TalkModeModal;
