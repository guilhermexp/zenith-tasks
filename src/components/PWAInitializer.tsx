'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { registerServiceWorker } from '@/utils/pwa';
import { analytics } from '@/utils/analytics';

export const PWAInitializer: React.FC = () => {
  const pathname = usePathname();

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Track page views
  useEffect(() => {
    if (pathname) {
      analytics.trackPageView(pathname, document.title);
    }
  }, [pathname]);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      analytics.trackEvent('connection_status', { status: 'online' });
    };

    const handleOffline = () => {
      analytics.trackEvent('connection_status', { status: 'offline' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PWAInitializer;
