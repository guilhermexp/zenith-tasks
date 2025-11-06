'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Modal {
  id: string;
  component: ReactNode;
  onClose?: () => void;
}

interface UIContextType {
  // Sidebar state
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;

  // Modal system
  modals: Modal[];
  openModal: (id: string, component: ReactNode, onClose?: () => void) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;

  // Loading state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Search state
  isSearchOpen: boolean;
  toggleSearch: () => void;
  openSearch: () => void;
  closeSearch: () => void;

  // Command palette state
  isCommandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;

  // Mobile view detection
  isMobileView: boolean;
  setIsMobileView: (isMobile: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};

interface UIProviderProps {
  children: ReactNode;
}

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal state
  const [modals, setModals] = useState<Modal[]>([]);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Mobile view state
  const [isMobileView, setIsMobileView] = useState(false);

  // Sidebar methods
  const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);
  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  // Modal methods
  const openModal = useCallback((id: string, component: ReactNode, onClose?: () => void) => {
    setModals(prev => [...prev, { id, component, onClose }]);
  }, []);

  const closeModal = useCallback((id: string) => {
    setModals(prev => {
      const modal = prev.find(m => m.id === id);
      if (modal?.onClose) {
        modal.onClose();
      }
      return prev.filter(m => m.id !== id);
    });
  }, []);

  const closeAllModals = useCallback(() => {
    modals.forEach(modal => {
      if (modal.onClose) {
        modal.onClose();
      }
    });
    setModals([]);
  }, [modals]);

  // Loading methods
  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  // Search methods
  const toggleSearch = useCallback(() => setIsSearchOpen(prev => !prev), []);
  const openSearch = useCallback(() => setIsSearchOpen(true), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);

  // Command palette methods
  const toggleCommandPalette = useCallback(() => setIsCommandPaletteOpen(prev => !prev), []);
  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);

  const value: UIContextType = {
    isSidebarOpen,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    modals,
    openModal,
    closeModal,
    closeAllModals,
    isLoading,
    setLoading,
    isSearchOpen,
    toggleSearch,
    openSearch,
    closeSearch,
    isCommandPaletteOpen,
    toggleCommandPalette,
    openCommandPalette,
    closeCommandPalette,
    isMobileView,
    setIsMobileView,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

export default UIProvider;
