// Central export file for all contexts

export { ThemeProvider, useTheme } from './ThemeContext';
export { UIProvider, useUI } from './UIContext';
export { UserPreferencesProvider, useUserPreferences } from './UserPreferencesContext';
export { WebSocketProvider, useWebSocketContext } from './WebSocketContext';

// Re-export types
export type { default as Theme } from './ThemeContext';
