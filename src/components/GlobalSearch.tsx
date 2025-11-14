'use client';

import { AnimatePresence, motion } from 'framer-motion';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

import { useUI } from '@/contexts/UIContext';
import type { MindFlowItem } from '@/types';

interface GlobalSearchProps {
  items: MindFlowItem[];
  onSelectItem: (item: MindFlowItem) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  items,
  onSelectItem,
}) => {
  const { isSearchOpen, closeSearch } = useUI();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!query.trim()) return [];

    const lowerQuery = query.toLowerCase();
    return items
      .filter((item) => {
        const titleMatch = item.title.toLowerCase().includes(lowerQuery);
        const typeMatch = item.type.toLowerCase().includes(lowerQuery);
        const summaryMatch = item.summary?.toLowerCase().includes(lowerQuery);
        const notesMatch = item.notes?.toLowerCase().includes(lowerQuery);

        return titleMatch || typeMatch || summaryMatch || notesMatch;
      })
      .slice(0, 10); // Limit to 10 results
  }, [items, query]);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isSearchOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeSearch();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredItems.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            onSelectItem(filteredItems[selectedIndex]);
            closeSearch();
            setQuery('');
          }
          break;
      }
    },
    [isSearchOpen, filteredItems, selectedIndex, onSelectItem, closeSearch]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when search is open
  useEffect(() => {
    if (isSearchOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setQuery('');
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSearchOpen]);

  if (typeof window === 'undefined' || !isSearchOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isSearchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-20"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeSearch}
          />

          {/* Search container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative z-10 w-full max-w-2xl mx-4 bg-neutral-900 rounded-lg border border-neutral-800 shadow-2xl overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 p-4 border-b border-neutral-800">
              <svg
                className="w-5 h-5 text-neutral-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar tarefas, ideias, notas..."
                className="flex-1 bg-transparent text-white placeholder-neutral-500 outline-none"
                autoFocus
              />
              <kbd className="px-2 py-1 text-xs text-neutral-400 bg-neutral-800 rounded">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {query.trim() && filteredItems.length === 0 && (
                <div className="p-8 text-center text-neutral-500">
                  Nenhum resultado encontrado para "{query}"
                </div>
              )}

              {filteredItems.length > 0 && (
                <ul className="py-2">
                  {filteredItems.map((item, index) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <button
                        onClick={() => {
                          onSelectItem(item);
                          closeSearch();
                          setQuery('');
                        }}
                        className={`
                          w-full text-left px-4 py-3 transition-colors
                          ${
                            index === selectedIndex
                              ? 'bg-neutral-800'
                              : 'hover:bg-neutral-800/50'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">
                              {item.title}
                            </p>
                            {item.summary && (
                              <p className="text-sm text-neutral-400 truncate mt-1">
                                {item.summary}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-1 rounded flex-shrink-0">
                            {item.type}
                          </span>
                        </div>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer with shortcuts */}
            {filteredItems.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-800 text-xs text-neutral-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded">↓</kbd>
                    navegar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded">↵</kbd>
                    selecionar
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default GlobalSearch;
