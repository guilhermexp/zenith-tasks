'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  separator = '/',
  className = '',
}) => {
  if (!items || items.length === 0) return null;

  return (
    <nav
      className={`flex items-center gap-2 text-sm text-zinc-400 ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-2 list-none">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="flex items-center gap-2">
              {/* Breadcrumb item */}
              {isLast ? (
                <span className="flex items-center gap-2 text-white font-medium">
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </span>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={item.onClick}
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {item.label}
                </motion.button>
              )}

              {/* Separator */}
              {!isLast && (
                <span className="text-zinc-600" aria-hidden="true">
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
