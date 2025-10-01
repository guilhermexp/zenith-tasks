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
  const [filter, setFilter] = useState<'todos' | 'entradas' | 'saidas' | 'cartoes'>('todos');

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
    <div className="h-full flex flex-col glass-card">
      {/* Header */}
      <div className="p-6">
        <h1 className="text-xl font-semibold text-neutral-100 mb-6">Finanças</h1>
        
        {/* Tabs */}
        <div className="flex gap-6 mb-6">
          <button
            onClick={() => setActiveTab('transacoes')}
            className={`pb-2 text-sm transition-colors relative ${
              activeTab === 'transacoes'
                ? 'text-neutral-300 border-b border-neutral-500'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            Transações
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2 text-sm transition-colors relative ${
              activeTab === 'status'
                ? 'text-neutral-300 border-b border-neutral-500'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            Status
          </button>
        </div>

        {/* Balance Summary */}
        <div className="mb-4">
          <p className="text-xs text-neutral-500 mb-2">Balanço do Mês</p>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-medium text-neutral-200">
              {formatCurrency(stats.balance)}
            </h2>
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500/60 rounded-full"></div>
                <span className="text-neutral-500">Entradas</span>
                <span className="text-neutral-300">
                  {formatCurrency(stats.entradas)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500/60 rounded-full"></div>
                <span className="text-neutral-500">Saídas</span>
                <span className="text-neutral-300">
                  {formatCurrency(stats.saidas)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Content */}
      <div className="flex-1 overflow-auto overscroll-contain p-6">
        {activeTab === 'transacoes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-neutral-400">Transações do Mês</h3>
              
              {/* Filter buttons */}
              <div className="flex gap-2">
                {(['todos', 'entradas', 'saidas', 'cartoes'] as const).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      filter === filterType
                        ? 'bg-neutral-800/70 text-neutral-300'
                        : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30'
                    }`}
                  >
                    {filterType === 'todos' ? 'Todos' : 
                     filterType === 'entradas' ? 'Entradas' : 
                     filterType === 'saidas' ? 'Saídas' : 'Cartões'}
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
                    className="flex items-center justify-between p-3 hover:bg-neutral-900/30 rounded-md transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        item.transactionType === 'Entrada' 
                          ? 'bg-green-500/60' 
                          : 'bg-red-500/60'
                      }`}></div>
                      
                      <div className="flex-1">
                        <h4 className="text-sm text-neutral-300">{item.title}</h4>
                        <p className="text-xs text-neutral-600 mt-0.5">
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
              <div className="text-center py-16 text-neutral-600">
                <p className="text-sm">Nenhuma transação encontrada</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'status' && (
          <div className="text-center py-16 text-neutral-500">
            <p className="text-sm">Em desenvolvimento...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancePage;
