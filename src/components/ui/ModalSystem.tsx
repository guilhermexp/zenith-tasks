'use client';

import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { useUI } from '@/contexts/UIContext';

export const ModalSystem: React.FC = () => {
  const { modals, closeModal } = useUI();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (modals.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modals.length]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {modals.map((modal, index) => (
        <motion.div
          key={modal.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ zIndex: 9999 + index }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => closeModal(modal.id)}
          />

          {/* Modal content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative z-10 max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {modal.component}
          </motion.div>
        </motion.div>
      ))}
    </AnimatePresence>,
    document.body
  );
};

interface ModalProps {
  children: React.ReactNode;
  title?: string;
  onClose?: () => void;
  size?: 'small' | 'medium' | 'large' | 'full';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  title,
  onClose,
  size = 'medium',
  showCloseButton = true,
}) => {
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'max-w-7xl w-full mx-4',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        w-full bg-neutral-900 rounded-lg border border-neutral-800 shadow-2xl
      `}
    >
      {/* Header */}
      {(title || showCloseButton) && (
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          {title && <h2 className="text-xl font-semibold text-white">{title}</h2>}
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-colors"
              aria-label="Fechar modal"
            >
              <svg
                className="w-6 h-6"
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
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-6">{children}</div>
    </div>
  );
};

export default ModalSystem;
