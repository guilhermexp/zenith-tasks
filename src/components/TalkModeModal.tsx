'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import type { MindFlowItem } from '@/types';
import { logger } from '@/utils/logger';

import {
  MicIcon,
  SoundWaveIcon,
  SpinnerIcon,
  CheckIcon,
  CheckCircleIcon,
  LightbulbIcon,
  PageIcon,
  BellIcon,
  DollarSignIcon,
  UsersIcon,
} from './Icons';

interface TalkModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAudioReady: (audio: Blob, onProgressUpdate: () => void) => Promise<MindFlowItem[]>;
  onCommitItems: (items: MindFlowItem[]) => Promise<void>;
}

type Status =
  | 'idle'
  | 'permission'
  | 'recording'
  | 'transcribing'
  | 'analyzing'
  | 'review'
  | 'submitting'
  | 'done'
  | 'error';

const logContext = { component: 'TalkModeModal' } as const;

const TalkModeModal: React.FC<TalkModeModalProps> = ({
  isOpen,
  onClose,
  onAudioReady,
  onCommitItems,
}) => {
  const [status, setStatusState] = useState<Status>('idle');
  
  const setStatus = (newStatus: Status) => {
    setStatusState(newStatus);
    statusRef.current = newStatus;
  };
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingItems, setPendingItems] = useState<MindFlowItem[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const statusRef = useRef<Status>('idle');
  const isSubmitting = status === 'submitting';

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
              try {
                const onProgressUpdate = () => {
                  logger.info('Progress update: moving to analyzing', logContext);
                  setStatus('analyzing');
                };
                const newItems = await onAudioReady(audioBlob, onProgressUpdate);
                setPendingItems(newItems);
                setSelectedMap(
                  newItems.reduce<Record<string, boolean>>((acc, item) => {
                    acc[item.id] = true;
                    return acc;
                  }, {}),
                );
                setErrorMessage('');
                if (!newItems.length) {
                  setStatus('error');
                  setErrorMessage('Não encontramos ações claras nessa gravação. Tente novamente com instruções mais diretas.');
                  return;
                }
                setStatus('review');
              } catch (e) {
                logger.error('Error processing audio with Gemini', e, logContext);
                setErrorMessage(`Erro: ${e instanceof Error ? e.message : 'Não foi possível processar o áudio'}`);
                setStatus('error');
              }
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
    setStatus('idle');
    setPendingItems([]);
    setSelectedMap({});
    setErrorMessage('');
    onClose();
  }, [stopRecording, onClose]);
  
  const handleRetry = () => {
    setErrorMessage('');
    setPendingItems([]);
    setSelectedMap({});
    setStatus('idle');
    statusRef.current = 'idle';
    startRecording();
  };

  const handleApprove = async () => {
    if (!pendingItems.length || isSubmitting) return;
    const selectedItems = pendingItems.filter(item => selectedMap[item.id]);
    if (!selectedItems.length) {
      setErrorMessage('Selecione pelo menos um item para criar.');
      return;
    }
    try {
      setErrorMessage('');
      setStatus('submitting');
      await onCommitItems(selectedItems);
      setStatus('done');
      setTimeout(onClose, 2000);
    } catch (err) {
      logger.error('Error committing talk mode items', err, logContext);
      setErrorMessage(
        err instanceof Error ? err.message : 'Não foi possível criar os itens. Tente novamente.',
      );
      setStatus('error');
    }
  };

  const toggleSelection = (id: string) => {
    setErrorMessage('');
    setSelectedMap(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAll = () => {
    setErrorMessage('');
    setSelectedMap(
      pendingItems.reduce<Record<string, boolean>>((acc, item) => {
        acc[item.id] = true;
        return acc;
      }, {}),
    );
  };

  const handleInvertSelection = () => {
    setErrorMessage('');
    setSelectedMap(prev =>
      pendingItems.reduce<Record<string, boolean>>((acc, item) => {
        acc[item.id] = !prev[item.id];
        return acc;
      }, {}),
    );
  };

  const handleClearSelection = () => {
    setErrorMessage('');
    setSelectedMap(
      pendingItems.reduce<Record<string, boolean>>((acc, item) => {
        acc[item.id] = false;
        return acc;
      }, {}),
    );
  };

  const typeIconMap: Record<MindFlowItem['type'], React.ComponentType<{ className?: string }>> = {
    Tarefa: CheckCircleIcon,
    Ideia: LightbulbIcon,
    Nota: PageIcon,
    Lembrete: BellIcon,
    Financeiro: DollarSignIcon,
    'Reunião': UsersIcon,
  };

  const destinationMap: Record<MindFlowItem['type'], string> = {
    Tarefa: 'Caixa de Entrada',
    Ideia: 'Biblioteca de ideias',
    Nota: 'Notas rápidas',
    Lembrete: 'Agenda & Lembretes',
    Financeiro: 'Painel financeiro',
    'Reunião': 'Calendário de reuniões',
  };

  const summaryStats = useMemo(() => {
    const total = pendingItems.length;
    const selected = pendingItems.reduce(
      (count, item) => (selectedMap[item.id] ? count + 1 : count),
      0,
    );
    const groupedSelected = pendingItems.reduce<Record<string, number>>((acc, item) => {
      if (!acc[item.type]) acc[item.type] = 0;
      if (selectedMap[item.id]) acc[item.type] += 1;
      return acc;
    }, {});
    const groupedTotal = pendingItems.reduce<Record<string, number>>((acc, item) => {
      if (!acc[item.type]) acc[item.type] = 0;
      acc[item.type] += 1;
      return acc;
    }, {});
    return { total, selected, groupedSelected, groupedTotal };
  }, [pendingItems, selectedMap]);

  const hasSelection = summaryStats.selected > 0;

  useEffect(() => {
    if (isOpen) {
      startRecording();
    } else {
      stopRecording();
      setStatus('idle');
      setTimeout(() => {
        setErrorMessage('');
        setPendingItems([]);
        setSelectedMap({});
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
          <div className="flex flex-col items-center text-center space-y-3 w-full">
            <div className="w-16 h-16 rounded-full bg-red-900/40 flex items-center justify-center border border-red-500/30">
              <MicIcon className="w-8 h-8 text-red-300" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-100">Algo deu errado</h2>
            <p className="text-sm text-neutral-400">{errorMessage}</p>
            <button
              onClick={handleRetry}
              className="mt-2 inline-flex items-center justify-center rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-100 transition-colors hover:bg-neutral-700"
            >
              Tentar novamente
            </button>
          </div>
        );
      case 'recording':
        return (
          <div className="flex flex-col items-center text-center space-y-3 w-full">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse-slow" />
              <div className="w-16 h-16 rounded-full bg-red-500/25 flex items-center justify-center border border-red-400/40">
                 <SoundWaveIcon className="w-8 h-8 text-red-200" />
              </div>
              {errorMessage && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {errorMessage}
                </div>
              )}
            </div>
            <h2 className="text-lg font-semibold text-neutral-100">Gravando...</h2>
            <p className="text-sm text-neutral-400">Fale no seu ritmo. Vamos organizar tudo para você no final.</p>
          </div>
        );
      case 'transcribing':
        return (
          <div className="flex flex-col items-center text-center space-y-3 w-full">
            <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center border border-white/10">
              <SpinnerIcon className="w-7 h-7 text-neutral-200 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-100">Transcrevendo com Gemini...</h2>
            <p className="text-sm text-neutral-400">Convertendo seu áudio em texto para analisarmos com mais clareza.</p>
          </div>
        );
      case 'analyzing':
        return (
          <div className="flex flex-col items-center text-center space-y-3 w-full">
            <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center border border-white/10">
              <SpinnerIcon className="w-7 h-7 text-neutral-200 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-100">Analisando sua nota...</h2>
            <p className="text-sm text-neutral-400">Estamos classificando cada intenção e sugerindo o melhor destino.</p>
          </div>
        );
      case 'review':
        return (
          <div className="flex flex-col items-stretch text-left space-y-4 w-full">
            <div className="flex flex-col gap-2">
              <div>
                <h2 className="text-lg font-semibold text-neutral-100">Revise antes de salvar</h2>
                <p className="text-sm text-neutral-400">
                  Ajuste o que preferir manter. Cada item será enviado para o destino correto automaticamente.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-neutral-900/40 px-4 py-3">
                <div className="text-sm text-neutral-300">
                  {summaryStats.selected} de {summaryStats.total} selecionados
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  {Object.entries(summaryStats.groupedTotal).map(([type, totalCount]) => {
                    const selectedCount = summaryStats.groupedSelected[type] ?? 0;
                    return (
                      <span
                        key={type}
                        className="rounded-full border border-white/10 bg-neutral-900/60 px-3 py-1 text-neutral-300"
                      >
                        {type}: {selectedCount}/{totalCount}
                      </span>
                    );
                  })}
                  {summaryStats.selected === 0 && (
                    <span className="text-neutral-500">Nenhum item selecionado</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={handleSelectAll}
                    className="rounded-md border border-white/10 px-3 py-1 text-neutral-300 transition-colors hover:text-neutral-100"
                  >
                    Selecionar tudo
                  </button>
                  <button
                    onClick={handleInvertSelection}
                    className="rounded-md border border-white/10 px-3 py-1 text-neutral-300 transition-colors hover:text-neutral-100"
                  >
                    Inverter seleção
                  </button>
                  <button
                    onClick={handleClearSelection}
                    disabled={!hasSelection}
                    className="rounded-md border border-white/10 px-3 py-1 text-neutral-300 transition-colors hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Limpar seleção
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2 max-h-[260px] overflow-auto soft-scroll pr-1">
              {pendingItems.map(item => {
                const Icon = typeIconMap[item.type] ?? CheckCircleIcon;
                const destination = destinationMap[item.type] ?? 'Caixa de Entrada';
                const isSelected = !!selectedMap[item.id];
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => toggleSelection(item.id)}
                    className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                      isSelected
                        ? 'border-neutral-700 bg-neutral-900/60 hover:border-neutral-600'
                        : 'border-neutral-900 bg-neutral-950/40 opacity-70 hover:opacity-90'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
                          isSelected
                            ? 'border-neutral-100 bg-neutral-100 text-neutral-900'
                            : 'border-white/10 text-neutral-600'
                        }`}
                      >
                        {isSelected ? (
                          <CheckIcon className="h-3.5 w-3.5" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-neutral-700" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-900/70 px-2.5 py-1 text-xs text-neutral-300">
                              <Icon className="h-3.5 w-3.5" />
                              {item.type}
                            </span>
                            {item.dueDate && (
                              <span className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-900/80 px-2 py-0.5 text-xs text-neutral-300">
                                vencimento {item.dueDate}
                              </span>
                            )}
                            {item.meetingDetails?.time && (
                              <span className="inline-flex items-center rounded-full border border-neutral-700 bg-neutral-900/80 px-2 py-0.5 text-xs text-neutral-300">
                                {item.meetingDetails.time}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-neutral-500">
                            Destino: {destination}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-neutral-100 leading-snug">{item.title}</p>
                          {item.summary && (
                            <p className="text-xs text-neutral-400 leading-snug line-clamp-2">
                              {item.summary}
                            </p>
                          )}
                          {item.meetingDetails?.participants?.length ? (
                            <p className="text-xs text-neutral-500 leading-snug">
                              Participantes: {item.meetingDetails.participants.join(', ')}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!pendingItems.length && (
                <div className="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm text-neutral-500">
                  Nenhum item identificado desta vez.
                </div>
              )}
              {pendingItems.length > 0 && !hasSelection && (
                <p className="text-center text-xs text-neutral-500 pt-2">
                  Selecione ao menos um item para prosseguir.
                </p>
              )}
            </div>
          </div>
        );
      case 'submitting':
        return (
          <div className="flex flex-col items-center text-center space-y-3 w-full">
            <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center border border-white/10">
              <SpinnerIcon className="w-7 h-7 text-neutral-200 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-100">Salvando itens...</h2>
            <p className="text-sm text-neutral-400">Estamos distribuindo os itens nos locais corretos.</p>
          </div>
        );
      case 'done':
        return (
          <div className="flex flex-col items-center text-center space-y-3 w-full">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center border border-green-400/30">
              <CheckIcon className="w-7 h-7 text-green-300" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-100">Itens criados!</h2>
            <div className="w-full rounded-md border border-white/5 bg-neutral-900/40 px-4 py-3 text-left text-sm text-neutral-400">
              Tudo certo — adicionamos os itens à sua conta.
            </div>
          </div>
        );
      case 'permission':
      case 'idle':
      default:
        return (
          <div className="flex flex-col items-center text-center space-y-3 w-full">
            <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center border border-white/10">
              <MicIcon className="w-7 h-7 text-neutral-200" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-100">Preparando microfone...</h2>
            <p className="text-sm text-neutral-400">Conceda acesso ao microfone para começar a registrar sua nota falada.</p>
          </div>
        );
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={handleClose} />
      <div className="relative z-[1001] glass-card w-[min(520px,90vw)] px-6 py-8 md:px-8 md:py-10 flex flex-col items-center text-center space-y-6 animate-scale-in" onClick={e => e.stopPropagation()}>
        {renderContent()}
        {status === 'recording' && (
          <div className="w-full flex justify-center">
            <button
              onClick={handleFinish}
              className="inline-flex items-center justify-center rounded-md bg-neutral-800 px-5 py-2 text-sm font-medium text-neutral-100 transition-colors hover:bg-neutral-700"
            >
              Concluir
            </button>
          </div>
        )}
        {status === 'review' && pendingItems.length > 0 && (
          <div className="w-full flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-neutral-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleApprove}
              disabled={isSubmitting || !hasSelection}
              className="inline-flex items-center justify-center rounded-md bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Aprovar e criar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TalkModeModal;
