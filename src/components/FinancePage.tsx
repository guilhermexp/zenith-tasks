'use client';

import React, { useState, useMemo } from 'react';

import type { MindFlowItem } from '../types';
// Icons are defined inline in this file, not imported from Icons.tsx

interface FinancePageProps {
  items: MindFlowItem[];
  onSelectItem: (item: MindFlowItem) => void;
  onAddFinancialItem: (type: 'Entrada' | 'Saída') => void;
}

const FinancePage: React.FC<FinancePageProps> = ({ 
  items, 
  onSelectItem, 
  onAddFinancialItem 
}) => {
  const [activeTab, setActiveTab] = useState<'transacoes' | 'status'>('transacoes');
  const [filter, setFilter] = useState<'todos' | 'entradas' | 'saidas' | 'cartoes' | 'assinaturas'>('todos');

  // Get financial items
  const financialItems = useMemo(() => {
    return items.filter(item => item.type === 'Financeiro');
  }, [items]);

  // Filter items based on current filters
  const filteredItems = useMemo(() => {
    let filtered = financialItems;

    if (filter === 'entradas') {
      filtered = filtered.filter(item => item.transactionType === 'Entrada');
    } else if (filter === 'saidas') {
      filtered = filtered.filter(item => item.transactionType === 'Saída');
    } else if (filter === 'cartoes') {
      filtered = filtered.filter(item =>
        item.paymentMethod && item.paymentMethod.toLowerCase().includes('cartão')
      );
    } else if (filter === 'assinaturas') {
      filtered = filtered.filter(item =>
        item.isRecurring === true && item.transactionType === 'Saída'
      );
    }

    return filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [financialItems, filter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const entradas = financialItems
      .filter(item => item.transactionType === 'Entrada')
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    
    const saidas = financialItems
      .filter(item => item.transactionType === 'Saída')
      .reduce((sum, item) => sum + (item.amount || 0), 0);
    
    const balance = entradas - saidas;

    return { balance, entradas, saidas };
  }, [financialItems]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <h1 className="text-base font-medium text-zinc-100">Finanças</h1>

        {/* Tabs */}
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('transacoes')}
            className={`pb-2 text-sm transition-colors relative ${
              activeTab === 'transacoes'
                ? 'text-zinc-300 border-b border-zinc-500'
                : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            Transações
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2 text-sm transition-colors relative ${
              activeTab === 'status'
                ? 'text-zinc-300 border-b border-zinc-500'
                : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >
            Status
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto overscroll-contain p-4">
        {/* Balance Summary */}
        <div className="mb-6">
          <p className="text-xs text-zinc-500 mb-2">Balanço do Mês</p>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-medium text-zinc-200">
              {formatCurrency(stats.balance)}
            </h2>
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500/60 rounded-full"></div>
                <span className="text-zinc-500">Entradas</span>
                <span className="text-zinc-300">
                  {formatCurrency(stats.entradas)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500/60 rounded-full"></div>
                <span className="text-zinc-500">Saídas</span>
                <span className="text-zinc-300">
                  {formatCurrency(stats.saidas)}
                </span>
              </div>
            </div>
          </div>
        </div>
        {activeTab === 'transacoes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-400">Transações do Mês</h3>
              
              {/* Filter buttons */}
              <div className="flex gap-2">
                {(['todos', 'entradas', 'saidas', 'assinaturas', 'cartoes'] as const).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      filter === filterType
                        ? 'bg-white/10 text-zinc-300'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    {filterType === 'todos' ? 'Todos' :
                     filterType === 'entradas' ? 'Entradas' :
                     filterType === 'saidas' ? 'Saídas' :
                     filterType === 'assinaturas' ? 'Assinaturas' : 'Cartões'}
                  </button>
                ))}
              </div>
            </div>

            {filteredItems.length > 0 ? (
              <div className="space-y-2">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="flex items-center justify-between p-3 hover:bg-white/5 rounded-md transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        item.transactionType === 'Entrada'
                          ? 'bg-green-500/60'
                          : 'bg-red-500/60'
                      }`}></div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm text-zinc-300">{item.title}</h4>
                          {item.isRecurring && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-[10px] text-blue-400">
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              recorrente
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <p className={`text-sm ${
                      item.transactionType === 'Entrada' ? 'text-green-500/80' : 'text-red-500/80'
                    }`}>
                      {item.transactionType === 'Entrada' ? '+' : '-'}{formatCurrency(Math.abs(item.amount || 0))}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-zinc-600">
                <p className="text-sm">Nenhuma transação encontrada</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'status' && (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-sm">Em desenvolvimento...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancePage;
