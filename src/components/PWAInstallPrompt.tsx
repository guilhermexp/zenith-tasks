'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState } from 'react';

import { setupInstallPrompt, promptInstall, canInstall } from '@/utils/pwa';

export const PWAInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Setup install prompt listener
    setupInstallPrompt();

    // Check if we should show the prompt
    const checkPrompt = () => {
      if (canInstall()) {
        // Don't show if already dismissed
        const dismissed = localStorage.getItem('pwa-prompt-dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      }
    };

    // Check after a delay to not interrupt user
    const timeout = setTimeout(checkPrompt, 5000);

    return () => clearTimeout(timeout);
  }, []);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[9999]"
        >
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-3xl">📱</div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">
                  Instalar Zenith Tasks
                </h3>
                <p className="text-sm text-neutral-400 mb-3">
                  Adicione o app à sua tela inicial para acesso rápido e experiência completa.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleInstall}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                  >
                    Instalar
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                  >
                    Agora não
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 text-neutral-500 hover:text-white transition-colors"
                aria-label="Fechar"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
