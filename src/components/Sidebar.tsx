'use client';

// Clerk desabilitado - bypass de autenticação
// import { UserButton } from '@clerk/nextjs';
import { User } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import type { NavItem } from '../types';
import {
  PlusIcon, XIcon, SearchIcon,
  SettingsIcon, LogOutIcon,
  CalendarIcon
} from './Icons';

interface SidebarProps {
  navItems: NavItem[];
  activeItem: string;
  onSelectItem: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenTalkMode: () => void;
  searchQuery: string;
  onSearch: (query: string) => void;
  onLogout?: () => void;
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  navItems,
  activeItem,
  onSelectItem,
  isOpen,
  onClose,
  onOpenTalkMode,
  searchQuery,
  onSearch,
  onLogout,
  isMobile = false,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['reunioes']);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const getIconTint = (_id: string, _active: boolean) => {
    // Keep a soft, consistent icon tint like the reference
    return 'text-neutral-600';
  };

  const renderNavItems = (items: NavItem[]) => {
    return items.map((item) => {
      if (item.isHeader) {
        // Section label styled like the reference (Favorites / Recent Chats)
        return (
          <li key={item.id} className="pt-4 pb-1 px-3">
            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wide">
              {item.label}
            </div>
          </li>
        );
      }

      const isActive = !searchQuery && activeItem === item.id;
      const isExpanded = expandedItems.includes(item.id);
      const hasChildren = item.children && item.children.length > 0;

      const handleItemClick = () => {
        if (hasChildren) {
          setExpandedItems(prev =>
            prev.includes(item.id)
              ? prev.filter(id => id !== item.id)
              : [...prev, item.id]
          );
        } else {
          onSelectItem(item.id);
          if (isMobile) {
            onClose();
          }
        }
      };

      return (
        <React.Fragment key={item.id}>
          <li
            className={`flex items-center px-3 py-2 rounded-lg cursor-pointer relative transition-colors ${
              isActive ? 'bg-neutral-800/60 text-neutral-100' : 'text-neutral-300 hover:bg-white/5'
            }`}
            onClick={handleItemClick}
          >
            {item.icon && <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${getIconTint(item.id, isActive)}`} />}
            <span className="flex-1 text-sm">{item.label}</span>
            {hasChildren && (
              <span className="text-xs text-neutral-500 mr-2">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            {item.count !== undefined && item.count > 0 && (
              <span className="text-xs text-neutral-300 bg-neutral-800/60 px-1.5 py-0.5 rounded-full font-mono border border-white/5">{item.count}</span>
            )}
          </li>
          {hasChildren && isExpanded && (
            <ul className="space-y-0.5 mt-1">
              {(item.children || []).map((child) => {
                const isChildActive = !searchQuery && activeItem === child.id;
                return (
                  <li
                    key={child.id}
                    className={`flex items-center px-3 py-2 rounded-lg cursor-pointer relative transition-colors ml-6 ${
                      isChildActive ? 'bg-neutral-800/60 text-neutral-100' : 'text-neutral-300 hover:bg-white/5'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectItem(child.id);
                    if (isMobile) {
                      onClose();
                    }
                  }}
                  >
                    <CalendarIcon className={`w-5 h-5 mr-3 flex-shrink-0 ${getIconTint(child.id, isChildActive)}`} />
                    <span className="flex-1 text-sm truncate" title={child.label}>{child.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 flex flex-col p-3 z-20
      transition-transform duration-300 ease-in-out
      w-64 md:relative md:translate-x-0
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      ${isMobile
        ? 'bg-neutral-950 shadow-2xl border border-white/10 backdrop-blur-lg'
        : 'bg-neutral-950/70 md:bg-neutral-950/60 md:border md:border-neutral-800/60 md:backdrop-blur-xl md:rounded-2xl'
      }
    `}>
        <div className="px-1 mb-3">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-neutral-300">Zenith Tasks</h2>
                <div className="flex items-center gap-2">
                    <button
                    onClick={() => {
                      onSelectItem('caixa-entrada');
                      if (isMobile) {
                        onClose();
                      }
                    }}
                      className="p-1.5 rounded-md hover:bg-neutral-800/60 transition-colors"
                      title="Novo"
                    >
                        <PlusIcon className="w-4 h-4 text-neutral-400" />
                    </button>
                    <button
                      onClick={() => setIsSearchOpen(!isSearchOpen)}
                      className="p-1.5 rounded-md hover:bg-neutral-800/60 transition-colors"
                      title="Buscar"
                    >
                        <SearchIcon className="w-4 h-4 text-neutral-400" />
                    </button>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-neutral-800 md:hidden">
                        <XIcon className="w-4 h-4 text-neutral-500" />
                    </button>
                </div>
            </div>
            {/* Search field */}
            {isSearchOpen && (
              <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                  <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search"
                      value={searchQuery}
                      onChange={(e) => onSearch(e.target.value)}
                      onBlur={(e) => {
                        // Fechar apenas se não houver texto e não estiver focando em outro elemento relacionado
                        if (!e.target.value) {
                          setTimeout(() => setIsSearchOpen(false), 200);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsSearchOpen(false);
                          onSearch('');
                        }
                      }}
                      className="w-full bg-neutral-900/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-600/40 transition-colors"
                  />
              </div>
            )}
        </div>

      <div className="flex-1 pr-2">
        <nav className="space-y-1">
          <ul>{renderNavItems(navItems)}</ul>
        </nav>
      </div>

      <div ref={dropdownRef} className="mt-auto relative">
        <div className="flex items-center justify-between p-2">
            <button
              onClick={() => {
                onOpenTalkMode();
                if (isMobile) {
                  onClose();
                }
              }}
              className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm rounded-md text-neutral-200 hover:bg-neutral-700"
            >
                <div 
                  className="relative rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 flex-shrink-0" 
                  style={{ width: '24px', height: '24px', transform: 'scale(1.04332)' }}
                />
                <span className="whitespace-nowrap">Talk mode</span>
            </button>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center justify-center px-1.5 py-1 rounded-full text-neutral-200 hover:bg-neutral-800/60 transition-colors"
                aria-haspopup="menu"
                aria-expanded={isDropdownOpen}
              >
                {/* UserButton do Clerk removido - bypass ativo */}
                <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center ring-1 ring-white/5">
                  <User className="w-4 h-4 text-neutral-400" />
                </div>
              </button>
            </div>
        </div>
        {isDropdownOpen && (
          <div className="absolute bottom-14 right-2 z-30 w-56 rounded-xl border border-white/10 bg-neutral-900/95 backdrop-blur-sm shadow-lg overflow-hidden">
            <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wide">
              Conta
            </div>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-200 hover:bg-white/5 transition-colors"
              onClick={() => {
                onSelectItem('config');
                setIsDropdownOpen(false);
                if (isMobile) {
                  onClose();
                }
              }}
            >
              <SettingsIcon className="w-4 h-4 text-neutral-400" />
              Configurações
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-200 hover:bg-white/5 transition-colors"
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  window.location.href = "/sign-in";
                }
                setIsDropdownOpen(false);
                if (isMobile) {
                  onClose();
                }
              }}
            >
              <LogOutIcon className="w-4 h-4 text-red-400" />
              Fazer logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
