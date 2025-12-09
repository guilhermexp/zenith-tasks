import { useState, useEffect, useRef, useCallback } from 'react';

interface UseDebouncedUpdateOptions {
  initialValue: string;
  onUpdate: (value: string) => Promise<void> | void;
  debounceMs?: number;
}

interface UseDebouncedUpdateReturn {
  localValue: string;
  setLocalValue: (value: string) => void;
  isDirty: boolean;
  isSaving: boolean;
  saveNow: () => Promise<void>;
  revert: () => void;
}

/**
 * Hook for debounced auto-save functionality
 * Manages local state vs persisted state with automatic saving
 */
export function useDebouncedUpdate({
  initialValue,
  onUpdate,
  debounceMs = 1000,
}: UseDebouncedUpdateOptions): UseDebouncedUpdateReturn {
  const [localValue, setLocalValueInternal] = useState(initialValue);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedValue = useRef(initialValue);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Sync with external changes (e.g., item refresh from server)
  useEffect(() => {
    if (!isDirty) {
      setLocalValueInternal(initialValue);
      lastSavedValue.current = initialValue;
    }
  }, [initialValue, isDirty]);

  const saveNow = useCallback(async () => {
    if (localValue === lastSavedValue.current) return;

    setIsSaving(true);
    try {
      await onUpdate(localValue);
      lastSavedValue.current = localValue;
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, [localValue, onUpdate]);

  const setLocalValue = useCallback((value: string) => {
    setLocalValueInternal(value);
    setIsDirty(value !== lastSavedValue.current);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new debounce timer
    debounceTimer.current = setTimeout(() => {
      if (value !== lastSavedValue.current) {
        // Trigger save
        setIsSaving(true);
        Promise.resolve(onUpdate(value))
          .then(() => {
            lastSavedValue.current = value;
            setIsDirty(false);
          })
          .finally(() => {
            setIsSaving(false);
          });
      }
    }, debounceMs);
  }, [debounceMs, onUpdate]);

  const revert = useCallback(() => {
    setLocalValueInternal(lastSavedValue.current);
    setIsDirty(false);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Save on blur (immediate save when user leaves the field)
  // This is handled by the component using this hook via saveNow()

  return {
    localValue,
    setLocalValue,
    isDirty,
    isSaving,
    saveNow,
    revert,
  };
}
