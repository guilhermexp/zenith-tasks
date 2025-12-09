'use client';

import { useEffect } from 'react';

import { registerServiceWorker } from '@/utils/pwa';

export const PWAInitializer: React.FC = () => {
  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null; // This component doesn't render anything
};

export default PWAInitializer;
