// PWA utilities for service worker registration and management

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration);

    // Check for updates every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available, notify user
          console.log('New version available!');
          if (
            confirm(
              'Uma nova versão do Zenith Tasks está disponível. Deseja recarregar a página?'
            )
          ) {
            window.location.reload();
          }
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    console.log('Service Worker unregistered:', success);
    return success;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
};

export const checkOnlineStatus = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

export const addOnlineListener = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('online', callback);
  return () => window.removeEventListener('online', callback);
};

export const addOfflineListener = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('offline', callback);
  return () => window.removeEventListener('offline', callback);
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

// Show notification
export const showNotification = async (
  title: string,
  options?: NotificationOptions
): Promise<void> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    ...options,
  });
};

// Check if app is installed (standalone mode)
export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

// Prompt to install PWA
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export const setupInstallPrompt = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    console.log('PWA install prompt available');
  });
};

export const promptInstall = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    console.log('No install prompt available');
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choiceResult.outcome === 'accepted';
  } catch (error) {
    console.error('Error showing install prompt:', error);
    return false;
  }
};

export const canInstall = (): boolean => {
  return deferredPrompt !== null;
};
