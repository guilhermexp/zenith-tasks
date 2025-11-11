'use client';

import React, { useState, useEffect } from 'react';
import { PatternSuggestionToast } from './ai/PatternSuggestionToast';
import type { PatternSuggestion } from '../types/ai-prioritization';

interface ToastSuggestion extends PatternSuggestion {
  id: string;
}

export const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [suggestions, setSuggestions] = useState<ToastSuggestion[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Load dismissed IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dismissedPatternSuggestions');
      if (stored) {
        setDismissedIds(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Failed to load dismissed suggestions:', error);
    }
  }, []);

  // Fetch pattern suggestions periodically
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        // TODO: Replace with actual API endpoint when ready
        // const response = await fetch('/api/patterns/suggestions');
        // if (response.ok) {
        //   const data = await response.json();
        //   const newSuggestions = data.suggestions
        //     .filter((s: any) => !dismissedIds.has(s.id))
        //     .map((s: any) => ({
        //       ...s,
        //       id: s.id || crypto.randomUUID(),
        //     }));
        //   setSuggestions(newSuggestions);
        // }

        // For now, do nothing - suggestions will be empty
      } catch (error) {
        console.error('Failed to fetch pattern suggestions:', error);
      }
    };

    // Fetch on mount and every 15 minutes
    fetchSuggestions();
    const interval = setInterval(fetchSuggestions, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [dismissedIds]);

  const handleAccept = async (suggestionId: string) => {
    const suggestion = suggestions.find((s) => s.id === suggestionId);
    if (!suggestion) return;

    try {
      // Call API to accept the suggestion
      await fetch('/api/patterns/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suggestionId }),
      });

      // Remove from suggestions
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
      throw error;
    }
  };

  const handleDismiss = (suggestionId: string) => {
    // Add to dismissed set and save to localStorage
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(suggestionId);
    setDismissedIds(newDismissed);

    try {
      localStorage.setItem(
        'dismissedPatternSuggestions',
        JSON.stringify(Array.from(newDismissed))
      );
    } catch (error) {
      console.error('Failed to save dismissed suggestions:', error);
    }

    // Remove from suggestions
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  };

  const handleRemindLater = (suggestionId: string) => {
    // Temporarily remove from suggestions
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));

    // Set a timeout to re-fetch suggestions after 1 hour
    setTimeout(() => {
      // Re-fetch suggestions if the component is still mounted
      // In a real implementation, you might want to store this in state
      // and check on the next fetch
    }, 60 * 60 * 1000);
  };

  return (
    <>
      {children}
      {suggestions.length > 0 && (
        <PatternSuggestionToast
          suggestions={suggestions}
          onAccept={handleAccept}
          onDismiss={handleDismiss}
          onRemindLater={handleRemindLater}
          maxVisible={3}
        />
      )}
    </>
  );
};

export default LayoutWrapper;
