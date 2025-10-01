"use client";
import React, { useState } from 'react';

import type { MindFlowItem } from '@/types';

interface Props {
  isOpen: boolean;
  items: MindFlowItem[];
  onConfirm: (selected: MindFlowItem[]) => void;
  onCancel: () => void;
}

const ItemsPreviewModal: React.FC<Props> = ({ isOpen, items, onConfirm, onCancel }) => {
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map(i => [i.id, true]))
  );

  if (!isOpen) return null;

  const toggle = (id: string) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  const confirm = () => onConfirm(items.filter(i => selected[i.id]));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative z-[1001] glass-card w-[min(520px,90vw)] p-4">
        <h3 className="text-neutral-200 font-semibold mb-2">Adicionar itens</h3>
        <p className="text-neutral-500 text-sm mb-3">Revise e selecione o que deseja criar.</p>
        <div className="max-h-[50vh] overflow-auto space-y-2">
          {items.map(i => (
            <label key={i.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-white/5 cursor-pointer">
              <input type="checkbox" checked={!!selected[i.id]} onChange={() => toggle(i.id)} className="mt-1" />
              <div className="min-w-0">
                <div className="text-sm text-neutral-200 truncate">{i.title}</div>
                <div className="text-xs text-neutral-500">{i.type}{i.dueDate ? ` • ${i.dueDate}` : ''}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="px-3 py-1.5 rounded-md text-sm text-neutral-400 hover:text-neutral-200">Cancelar</button>
          <button onClick={confirm} className="px-3 py-1.5 rounded-md text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-100">Confirmar</button>
        </div>
      </div>
    </div>
  );
};

export default ItemsPreviewModal;

