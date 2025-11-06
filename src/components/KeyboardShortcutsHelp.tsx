'use client';

import { AnimatePresence, motion } from 'motion/react';
import React, { useState, useEffect } from 'react';

import { Modal } from './ui/ModalSystem';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['Ctrl', 'K'], description: 'Abrir busca global', category: 'Navegação' },
  { keys: ['Ctrl', '/'], description: 'Mostrar atalhos de teclado', category: 'Navegação' },
  { keys: ['Ctrl', 'B'], description: 'Alternar sidebar', category: 'Navegação' },

  // Actions
  { keys: ['Ctrl', 'N'], description: 'Nova tarefa', category: 'Ações' },
  { keys: ['Ctrl', 'S'], description: 'Salvar', category: 'Ações' },
  { keys: ['Ctrl', 'D'], description: 'Duplicar item', category: 'Ações' },
  { keys: ['Delete'], description: 'Deletar item selecionado', category: 'Ações' },

  // View
  { keys: ['1'], description: 'Ver Caixa de Entrada', category: 'Visualização' },
  { keys: ['2'], description: 'Ver Tarefas', category: 'Visualização' },
  { keys: ['3'], description: 'Ver Ideias', category: 'Visualização' },
  { keys: ['4'], description: 'Ver Calendário', category: 'Visualização' },

  // AI
  { keys: ['Ctrl', 'Space'], description: 'Abrir assistente AI', category: 'IA' },
  { keys: ['Ctrl', 'M'], description: 'Modo de conversa', category: 'IA' },

  // General
  { keys: ['Esc'], description: 'Fechar modal/busca', category: 'Geral' },
  { keys: ['?'], description: 'Mostrar ajuda', category: 'Geral' },
];

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  if (!isOpen) return null;

  return (
    <Modal title="Atalhos de Teclado" onClose={onClose} size="large">
      <div className="space-y-6">
        {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
          <div key={category}>
            <h3 className="text-lg font-semibold text-white mb-3">{category}</h3>
            <div className="space-y-2">
              {categoryShortcuts.map((shortcut, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <span className="text-neutral-300">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, keyIndex) => (
                      <React.Fragment key={keyIndex}>
                        <kbd className="px-3 py-1.5 text-sm font-medium text-white bg-neutral-700 rounded border border-neutral-600 shadow-sm">
                          {key}
                        </kbd>
                        {keyIndex < shortcut.keys.length - 1 && (
                          <span className="text-neutral-500 mx-1">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
        <p className="text-sm text-blue-200">
          💡 <strong>Dica:</strong> Use Ctrl (ou Cmd no Mac) + / a qualquer momento
          para ver esta lista de atalhos.
        </p>
      </div>
    </Modal>
  );
};

export const useKeyboardShortcutsHelp = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+/ or Cmd+/ to toggle shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // ? to show shortcuts help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA' &&
          !target.isContentEditable
        ) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
      // Esc to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
};

export default KeyboardShortcutsHelp;
