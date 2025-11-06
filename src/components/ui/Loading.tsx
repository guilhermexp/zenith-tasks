'use client';

import { motion } from 'motion/react';
import React from 'react';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  message?: string;
  overlay?: boolean;
}

const sizeMap = {
  small: 'w-6 h-6',
  medium: 'w-12 h-12',
  large: 'w-16 h-16',
};

export const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  fullScreen = false,
  message,
  overlay = false,
}) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <motion.div
        className={`${sizeMap[size]} border-4 border-neutral-700 border-t-blue-500 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      {message && (
        <p className="text-sm text-neutral-400 animate-pulse">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-neutral-950">
        {spinner}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export const LoadingDots: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({
  size = 'medium',
}) => {
  const dotSizes = {
    small: 'w-1.5 h-1.5',
    medium: 'w-2 h-2',
    large: 'w-3 h-3',
  };

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`${dotSizes[size]} bg-blue-500 rounded-full`}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
};

export const LoadingBar: React.FC<{ progress?: number }> = ({ progress }) => {
  return (
    <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
        initial={{ width: '0%' }}
        animate={{ width: progress ? `${progress}%` : '100%' }}
        transition={
          progress
            ? { duration: 0.3 }
            : {
                duration: 1.5,
                repeat: Infinity,
                repeatType: 'reverse',
              }
        }
      />
    </div>
  );
};

export const LoadingSkeleton: React.FC<{
  className?: string;
  count?: number;
}> = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-neutral-800 rounded ${className}`}
        />
      ))}
    </>
  );
};

export default Loading;
