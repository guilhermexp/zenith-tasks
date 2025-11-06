'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface UserPreferences {
  // View preferences
  defaultView: 'list' | 'grid' | 'kanban';
  itemsPerPage: number;
  sortBy: 'createdAt' | 'dueDate' | 'title' | 'type';
  sortOrder: 'asc' | 'desc';

  // Feature flags
  enableNotifications: boolean;
  enableSounds: boolean;
  enableAnimations: boolean;
  enableAIFeatures: boolean;

  // Display preferences
  showCompletedTasks: boolean;
  showSubtasks: boolean;
  compactMode: boolean;

  // AI preferences
  aiModel: string;
  aiTemperature: number;

  // Accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';

  // Language
  language: 'pt-BR' | 'en-US';
}

const defaultPreferences: UserPreferences = {
  defaultView: 'list',
  itemsPerPage: 20,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  enableNotifications: true,
  enableSounds: false,
  enableAnimations: true,
  enableAIFeatures: true,
  showCompletedTasks: true,
  showSubtasks: true,
  compactMode: false,
  aiModel: 'gemini-2.5-flash',
  aiTemperature: 0.7,
  reducedMotion: false,
  highContrast: false,
  fontSize: 'medium',
  language: 'pt-BR',
};

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return context;
};

interface UserPreferencesProviderProps {
  children: ReactNode;
  storageKey?: string;
}

export const UserPreferencesProvider: React.FC<UserPreferencesProviderProps> = ({
  children,
  storageKey = 'zenith-user-preferences',
}) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }, [storageKey]);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }, [preferences, storageKey]);

  // Apply accessibility preferences
  useEffect(() => {
    const root = document.documentElement;

    // Reduced motion
    if (preferences.reducedMotion) {
      root.style.setProperty('--motion-reduce', '1');
    } else {
      root.style.removeProperty('--motion-reduce');
    }

    // Font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.setProperty('--base-font-size', fontSizeMap[preferences.fontSize]);

    // High contrast
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  }, [preferences.reducedMotion, preferences.fontSize, preferences.highContrast]);

  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreferences(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
  }, []);

  const value: UserPreferencesContextType = {
    preferences,
    updatePreference,
    updatePreferences,
    resetPreferences,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export default UserPreferencesProvider;
